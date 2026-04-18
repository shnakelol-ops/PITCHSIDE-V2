// <!-- redeploy trigger -->
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { PitchSport } from "@/config/pitchConfig";
import {
  downloadPitchCanvasPng,
  shareOrDownloadPitchPng,
} from "@/lib/pitch-canvas-export";
import { persistSimulatorPhaseChange } from "@/lib/persist-simulator-phase-change";
import { persistSimulatorStatsEvent } from "@/lib/persist-simulator-stats-event";
import {
  SimulatorPixiSurface,
  type SimulatorPixiSurfaceHandle,
  type SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
import { StatsScorerStrip } from "@src/features/stats/controls/stats-scorer-strip";
import { StatsVoiceStrip } from "@src/features/stats/controls/stats-voice-strip";
import { useSimulatorMatchClock } from "@src/features/stats/hooks/use-simulator-match-clock";
import { useStatsEventLog } from "@src/features/stats/hooks/use-stats-event-log";
import { useStatsVoiceRecorder } from "@src/features/stats/hooks/use-stats-voice-recorder";
import { findLatestScorePendingScorer } from "@src/features/stats/model/stats-scorer-utils";
import type {
  StatsPeriodPhase,
  StatsLoggedEvent,
} from "@src/features/stats/model/stats-logged-event";
import {
  STATS_V1_EVENT_KINDS,
  STATS_V1_FIELD_KINDS,
  STATS_V1_SCORE_KINDS,
  type StatsV1EventKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";
import {
  STATS_DEV_PLACEHOLDER_ROSTER,
  type StatsRosterPlayer,
} from "@src/features/stats/types/stats-roster";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

const PITCH_OPTIONS: { id: PitchSport; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic" },
  { id: "hurling", label: "Hurling" },
];

const STATS_REVIEW_CHIPS: { mode: StatsReviewMode; label: string }[] = [
  { mode: "live", label: "Live" },
  { mode: "halftime", label: "HT" },
  { mode: "full_time", label: "FT" },
];

type PitchMarkerViewFilter = "all" | StatsV1EventKind;

type LinkedMatchPeriod = "FIRST_HALF" | "HALF_TIME" | "SECOND_HALF" | "FULL_TIME";

const MATCH_PERIOD: Record<LinkedMatchPeriod, LinkedMatchPeriod> = {
  FIRST_HALF: "FIRST_HALF",
  HALF_TIME: "HALF_TIME",
  SECOND_HALF: "SECOND_HALF",
  FULL_TIME: "FULL_TIME",
};

const PITCH_VIEW_FILTER_CHIPS: {
  id: PitchMarkerViewFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  ...STATS_V1_EVENT_KINDS.map((k) => ({
    id: k,
    label: k.replace(/_/g, " "),
  })),
];

const btnBase =
  "inline-flex min-h-8 items-center justify-center rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px] text-stone-100 transition hover:border-white/25 hover:bg-[rgba(56,66,92,0.82)]";
const mobileActionBtnClass =
  "min-h-9 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px] text-stone-100 hover:border-white/25 hover:bg-[rgba(56,66,92,0.82)]";

function reviewChipClass(active: boolean): string {
  return cn(
    btnBase,
    "min-h-7 rounded-md px-1.5 py-1 text-[8px] font-bold uppercase tracking-wide sm:text-[8.5px]",
    active &&
      "border-amber-300/55 bg-[rgba(98,80,46,0.72)] text-amber-50 shadow-[0_0_0_1px_rgba(245,207,120,0.18)]",
  );
}

function kindUiLabel(kind: string): string {
  return kind.replace(/_/g, " ").toLowerCase();
}

function formatMatchPhaseLabel(phase: string): string {
  return phase.replace(/_/g, " ");
}

export type SimulatorFloatingShellProps = {
  initialSurfaceMode?: SimulatorSurfaceMode;
  linkedMatchId?: string | null;
};

export function SimulatorFloatingShell({
  initialSurfaceMode = "SIMULATOR",
  linkedMatchId = null,
}: SimulatorFloatingShellProps = {}) {
  const [surfaceMode, setSurfaceMode] =
    useState<SimulatorSurfaceMode>(initialSurfaceMode);
  const [sport, setSport] = useState<PitchSport>("gaelic");
  const [pathRecording, setPathRecording] = useState(false);
  const [shadowRecording, setShadowRecording] = useState(false);

  const [utilityOpen, setUtilityOpen] = useState(false);
  const utilityWrapRef = useRef<HTMLDivElement | null>(null);
  const pitchHostRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<SimulatorPixiSurfaceHandle>(null);

  const linkedMatchIdRef = useRef<string | null>(null);
  linkedMatchIdRef.current = linkedMatchId;
  const [linkedMatchPeriod, setLinkedMatchPeriod] = useState<LinkedMatchPeriod>(
    MATCH_PERIOD.FIRST_HALF,
  );
  const linkedMatchPeriodRef = useRef(linkedMatchPeriod);
  linkedMatchPeriodRef.current = linkedMatchPeriod;

  const [statsPersistError, setStatsPersistError] = useState<string | null>(null);
  const persistErrorClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [statsPlayers, setStatsPlayers] = useState<StatsRosterPlayer[]>(
    STATS_DEV_PLACEHOLDER_ROSTER,
  );
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const [playerNumberDraft, setPlayerNumberDraft] = useState("");

  const [pitchExportError, setPitchExportError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [pendingVoiceId, setPendingVoiceId] = useState<string | null>(null);
  const [pitchMarkerViewFilter, setPitchMarkerViewFilter] =
    useState<PitchMarkerViewFilter>("all");
  const [mobileStatsDrawerOpen, setMobileStatsDrawerOpen] = useState(false);

  useEffect(() => {
    setSurfaceMode(initialSurfaceMode);
    if (initialSurfaceMode === "STATS") {
      setPathRecording(false);
      setShadowRecording(false);
    }
  }, [initialSurfaceMode]);

  useEffect(() => {
    return () => {
      if (persistErrorClearTimerRef.current != null) {
        clearTimeout(persistErrorClearTimerRef.current);
        persistErrorClearTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const mid = linkedMatchId;
    if (!mid) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/events?matchId=${encodeURIComponent(mid)}&_=${Date.now()}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as {
          data?: { currentPeriod?: string | null };
        };
        if (cancelled || !res.ok) return;
        const p = json.data?.currentPeriod;
        if (p != null) {
          const next =
            p === MATCH_PERIOD.FIRST_HALF ||
            p === MATCH_PERIOD.HALF_TIME ||
            p === MATCH_PERIOD.SECOND_HALF ||
            p === MATCH_PERIOD.FULL_TIME
              ? p
              : MATCH_PERIOD.FIRST_HALF;
          setLinkedMatchPeriod(next);
          linkedMatchPeriodRef.current = next;
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedMatchId]);

  const matchClock = useSimulatorMatchClock(surfaceMode === "STATS");
  const {
    phase: matchPhase,
    setPhase: setMatchPhase,
    firstHalfSec,
    secondHalfSec,
    running: matchClockRunning,
    setRunning: setMatchClockRunning,
    clockLabelRef: matchClockLabelRef,
  } = matchClock;

  const resolveCurrentPeriodPhase = useCallback((): StatsPeriodPhase => {
    switch (matchPhase) {
      case "first_half":
        return "first_half";
      case "halftime":
        return "half_time";
      case "second_half":
        return "second_half";
      case "full_time":
        return "full_time";
      default:
        return "unspecified";
    }
  }, [matchPhase]);

  const onStatsEventLogged = useCallback(
    (event: StatsLoggedEvent) => {
      const mid = linkedMatchIdRef.current;
      if (!mid) return;
      void persistSimulatorStatsEvent({
        matchId: mid,
        matchPeriod: linkedMatchPeriodRef.current,
        clockLabel: matchClockLabelRef.current,
        event,
      }).catch((err: unknown) => {
        console.error("[simulator-stats] persist failed", err);
        const message = err instanceof Error ? err.message : "Couldn’t save event.";
        setStatsPersistError(message);
        if (persistErrorClearTimerRef.current != null) {
          clearTimeout(persistErrorClearTimerRef.current);
        }
        persistErrorClearTimerRef.current = setTimeout(() => {
          setStatsPersistError(null);
          persistErrorClearTimerRef.current = null;
        }, 8000);
      });
    },
    [matchClockLabelRef],
  );

  const {
    events: statsEvents,
    arm: statsArm,
    activeScorerId,
    reviewMode,
    voiceMomentIds,
    armKind,
    clearArm,
    logTap,
    undoLastEvent,
    resetEvents,
    setActiveScorer,
    setReviewMode,
    storeVoiceBlob,
    removeVoiceBlob,
    playVoiceNote,
    attachVoiceNoteToEvent,
    addVoiceMoment,
  } = useStatsEventLog({
    onStatsEventLogged,
    resolvePeriodPhase: resolveCurrentPeriodPhase,
  });

  const recorder = useStatsVoiceRecorder();

  const isStatsLive = reviewMode === "live";
  const canStatsPitchLog =
    reviewMode === "live" &&
    (matchPhase === "first_half" || matchPhase === "second_half");
  const canStatsPitchLogRef = useRef(canStatsPitchLog);
  canStatsPitchLogRef.current = canStatsPitchLog;
  const onStatsPitchTapGuarded = useCallback(
    (payload: StatsPitchTapPayload) => {
      if (!canStatsPitchLogRef.current) return;
      logTap(payload);
    },
    [logTap],
  );

  const persistPhase = useCallback(
    (matchPeriod: LinkedMatchPeriod) => {
      const mid = linkedMatchIdRef.current;
      if (!mid) return;
      void persistSimulatorPhaseChange({
        matchId: mid,
        matchPeriod,
        clockLabel: matchClockLabelRef.current,
      }).catch((err: unknown) => {
        console.error("[simulator-stats] phase persist failed", err);
      });
    },
    [matchClockLabelRef],
  );

  const onStartMatch = useCallback(() => {
    if (matchPhase !== "pre_match") return;
    setMatchPhase("first_half");
    setReviewMode("live");
    setMatchClockRunning(true);
    linkedMatchPeriodRef.current = MATCH_PERIOD.FIRST_HALF;
    setLinkedMatchPeriod(MATCH_PERIOD.FIRST_HALF);
    persistPhase(MATCH_PERIOD.FIRST_HALF);
  }, [matchPhase, persistPhase, setMatchClockRunning, setMatchPhase, setReviewMode]);

  const onStopMatch = useCallback(() => {
    if (matchPhase !== "first_half" && matchPhase !== "second_half") return;
    setMatchClockRunning(false);
  }, [matchPhase, setMatchClockRunning]);

  const onResumeMatch = useCallback(() => {
    if (matchPhase !== "first_half" && matchPhase !== "second_half") return;
    setReviewMode("live");
    setMatchClockRunning(true);
  }, [matchPhase, setMatchClockRunning, setReviewMode]);

  const onHalfTime = useCallback(() => {
    if (matchPhase !== "first_half") return;
    setMatchClockRunning(false);
    setMatchPhase("halftime");
    setReviewMode("halftime");
    linkedMatchPeriodRef.current = MATCH_PERIOD.HALF_TIME;
    setLinkedMatchPeriod(MATCH_PERIOD.HALF_TIME);
    persistPhase(MATCH_PERIOD.HALF_TIME);
  }, [matchPhase, persistPhase, setMatchClockRunning, setMatchPhase, setReviewMode]);

  const onStartSecondHalf = useCallback(() => {
    if (matchPhase !== "halftime") return;
    setMatchPhase("second_half");
    setReviewMode("live");
    setMatchClockRunning(true);
    linkedMatchPeriodRef.current = MATCH_PERIOD.SECOND_HALF;
    setLinkedMatchPeriod(MATCH_PERIOD.SECOND_HALF);
    persistPhase(MATCH_PERIOD.SECOND_HALF);
  }, [matchPhase, persistPhase, setMatchClockRunning, setMatchPhase, setReviewMode]);

  const onFullTime = useCallback(() => {
    if (matchPhase !== "second_half") return;
    setMatchClockRunning(false);
    setMatchPhase("full_time");
    setReviewMode("full_time");
    linkedMatchPeriodRef.current = MATCH_PERIOD.FULL_TIME;
    setLinkedMatchPeriod(MATCH_PERIOD.FULL_TIME);
    persistPhase(MATCH_PERIOD.FULL_TIME);
  }, [matchPhase, persistPhase, setMatchClockRunning, setMatchPhase, setReviewMode]);

  const matchClockDisplay = useMemo(() => {
    if (matchPhase === "pre_match") return "—";
    const toMmSs = (totalSec: number) => {
      const s = Math.max(0, Math.floor(totalSec));
      const m = Math.floor(s / 60);
      const r = s % 60;
      return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
    };
    if (matchPhase === "first_half" || matchPhase === "halftime") {
      return `1H ${toMmSs(firstHalfSec)}`;
    }
    return `2H ${toMmSs(secondHalfSec)}`;
  }, [firstHalfSec, matchPhase, secondHalfSec]);

  const statsEventsForReviewWindow = useMemo(() => {
    if (reviewMode === "live") return statsEvents;
    if (reviewMode === "halftime") {
      return statsEvents.filter(
        (e) => e.periodPhase === "first_half" || e.periodPhase === "half_time",
      );
    }
    return statsEvents;
  }, [reviewMode, statsEvents]);

  useEffect(() => {
    if (canStatsPitchLog) setPitchMarkerViewFilter("all");
  }, [canStatsPitchLog]);

  const statsEventsForPitchView = useMemo(() => {
    if (isStatsLive || pitchMarkerViewFilter === "all") return statsEventsForReviewWindow;
    return statsEventsForReviewWindow.filter((e) => e.kind === pitchMarkerViewFilter);
  }, [isStatsLive, pitchMarkerViewFilter, statsEventsForReviewWindow]);

  const pendingScore = useMemo(
    () => findLatestScorePendingScorer(statsEvents),
    [statsEvents],
  );
  const pendingScoreLabel = useMemo(() => {
    if (!pendingScore) return null;
    return `Tag ${kindUiLabel(pendingScore.kind)}`;
  }, [pendingScore]);
  const activeScorerPlayer = useMemo(
    () => statsPlayers.find((p) => p.id === activeScorerId) ?? null,
    [activeScorerId, statsPlayers],
  );
  const recentStatsEvents = useMemo(
    () => [...statsEvents].slice(-5).reverse(),
    [statsEvents],
  );
  const lastStatsEvent =
    statsEvents.length > 0 ? statsEvents[statsEvents.length - 1] : undefined;
  const eventsWithVoice = useMemo(
    () =>
      statsEvents
        .filter((e) => e.voiceNoteId != null && e.voiceNoteId.length > 0)
        .slice(-6),
    [statsEvents],
  );
  const voiceError = recorder.error ?? captureError;

  useEffect(() => {
    if (surfaceMode !== "STATS") return;
    if (statsArm != null) return;
    armKind("SHOT");
  }, [armKind, statsArm, surfaceMode]);

  const onStartVoice = useCallback(async () => {
    setCaptureError(null);
    if (pendingVoiceId) {
      removeVoiceBlob(pendingVoiceId);
      setPendingVoiceId(null);
    }
    await recorder.startRecording();
  }, [pendingVoiceId, recorder, removeVoiceBlob]);

  const onStopVoice = useCallback(async () => {
    setCaptureError(null);
    const blob = await recorder.stopRecording();
    if (!blob || blob.size === 0) {
      setCaptureError("Nothing captured");
      return;
    }
    const c = globalThis.crypto;
    const id =
      c && "randomUUID" in c && typeof c.randomUUID === "function"
        ? c.randomUUID()
        : `vn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    storeVoiceBlob(id, blob);
    setPendingVoiceId(id);
  }, [recorder, storeVoiceBlob]);

  const onAttachVoiceToLastEvent = useCallback(() => {
    if (!pendingVoiceId || !lastStatsEvent) return;
    attachVoiceNoteToEvent(lastStatsEvent.id, pendingVoiceId);
    setPendingVoiceId(null);
  }, [attachVoiceNoteToEvent, lastStatsEvent, pendingVoiceId]);

  const onAttachVoiceAsMoment = useCallback(() => {
    if (!pendingVoiceId) return;
    addVoiceMoment(pendingVoiceId);
    setPendingVoiceId(null);
  }, [addVoiceMoment, pendingVoiceId]);

  const onDiscardPendingVoice = useCallback(() => {
    if (pendingVoiceId) removeVoiceBlob(pendingVoiceId);
    setPendingVoiceId(null);
    setCaptureError(null);
  }, [pendingVoiceId, removeVoiceBlob]);

  const onAddStatsPlayer = useCallback(() => {
    const nextName = playerNameDraft.trim();
    const nextNumber = playerNumberDraft.trim();
    if (!nextName || !nextNumber) return;
    setStatsPlayers((prev) => {
      if (prev.length >= 15) return prev;
      const id = `stats-player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return [...prev, { id, name: nextName, number: nextNumber }];
    });
    setPlayerNameDraft("");
    setPlayerNumberDraft("");
  }, [playerNameDraft, playerNumberDraft]);

  const setMainRecording = (on: boolean) => {
    setPathRecording(on);
    if (on) setShadowRecording(false);
  };

  const setShadowLineRecording = (on: boolean) => {
    setShadowRecording(on);
    if (on) setPathRecording(false);
  };

  const onExportPitchPng = useCallback(() => {
    setPitchExportError(null);
    void downloadPitchCanvasPng(pitchHostRef.current, {
      filename: `pitchside-pitch-${Date.now()}.png`,
    }).then((r) => {
      if (!r.ok) setPitchExportError(r.error);
    });
  }, []);

  const onSharePitchPng = useCallback(() => {
    setPitchExportError(null);
    void shareOrDownloadPitchPng(pitchHostRef.current, {
      filename: `pitchside-pitch-${Date.now()}.png`,
    }).then((r) => {
      if (!r.ok) setPitchExportError(r.error);
    });
  }, []);

  const setMode = (mode: SimulatorSurfaceMode) => {
    setSurfaceMode(mode);
    if (mode === "STATS") {
      setPathRecording(false);
      setShadowRecording(false);
    }
  };

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!utilityOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (utilityWrapRef.current?.contains(target)) return;
      setUtilityOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [utilityOpen]);

  useEffect(() => {
    if (surfaceMode !== "STATS") {
      setMobileStatsDrawerOpen(false);
    }
  }, [surfaceMode]);

  return (
    <div className="simulator-direct relative h-[100dvh] min-h-0 overflow-hidden bg-[#0b0f0c] text-stone-100">
      <div ref={pitchHostRef} className="absolute inset-0">
        <div className="w-full h-[100vh]">
          <SimulatorPixiSurface
            ref={surfaceRef}
            sport={sport}
            recordingMode={surfaceMode === "SIMULATOR" ? pathRecording : false}
            shadowRecordingMode={surfaceMode === "SIMULATOR" ? shadowRecording : false}
            surfaceMode={surfaceMode}
            statsArm={surfaceMode === "STATS" ? statsArm : null}
            statsLoggedEvents={surfaceMode === "STATS" ? statsEventsForPitchView : []}
            onStatsPitchTap={surfaceMode === "STATS" ? onStatsPitchTapGuarded : undefined}
            statsReviewMode={reviewMode}
            statsPitchInteractive={canStatsPitchLog}
            className="w-full h-full"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-40">
        <div className="pointer-events-none absolute left-3 top-2">
          <p className="rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-stone-200/70 backdrop-blur">
            Simulator
          </p>
        </div>

        <div
          className={cn(
            "pointer-events-none absolute bottom-[max(0.55rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2",
            surfaceMode === "STATS" && "hidden md:block",
          )}
        >
          <div className="simulator-transport-strip pointer-events-none flex items-center gap-1 rounded-xl px-2 py-1 backdrop-blur-md">
            {surfaceMode === "SIMULATOR" ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
                  onClick={() => surfaceRef.current?.play()}
                >
                  Play
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
                  onClick={() => surfaceRef.current?.pause()}
                >
                  Pause
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
                  onClick={() => surfaceRef.current?.reset()}
                >
                  Reset
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={matchPhase !== "pre_match"}
                  className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100 disabled:opacity-50"
                  onClick={onStartMatch}
                >
                  Start
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    !matchClockRunning ||
                    (matchPhase !== "first_half" && matchPhase !== "second_half")
                  }
                  className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100 disabled:opacity-50"
                  onClick={onStopMatch}
                >
                  Stop
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    matchClockRunning ||
                    (matchPhase !== "first_half" && matchPhase !== "second_half")
                  }
                  className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100 disabled:opacity-50"
                  onClick={onResumeMatch}
                >
                  Resume
                </Button>
              </>
            )}
          </div>
        </div>

        {surfaceMode === "STATS" ? (
          <aside
            className="pointer-events-none absolute left-[max(0.45rem,env(safe-area-inset-left))] top-1/2 z-40 hidden -translate-y-1/2 md:block"
            aria-label="Live matchday rail"
          >
            <div className="simulator-live-rail pointer-events-none flex w-[3.6rem] flex-col items-stretch gap-1 rounded-2xl p-1.5 backdrop-blur-md">
              <Button
                type="button"
                variant="secondary"
                className="simulator-live-rail-chip pointer-events-auto min-h-9 rounded-xl px-1 py-1 text-[9px] font-semibold"
                aria-pressed={reviewMode === "live"}
                onClick={() => setReviewMode("live")}
              >
                {matchClockDisplay}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="simulator-live-rail-chip pointer-events-auto min-h-8 rounded-lg px-1 py-1 text-[9px] font-semibold"
                disabled={matchPhase !== "first_half"}
                onClick={onHalfTime}
              >
                HT
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="simulator-live-rail-chip pointer-events-auto min-h-8 rounded-lg px-1 py-1 text-[9px] font-semibold"
                disabled={matchPhase !== "halftime"}
                onClick={onStartSecondHalf}
              >
                2H
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="simulator-live-rail-chip pointer-events-auto min-h-8 rounded-lg px-1 py-1 text-[9px] font-semibold"
                disabled={matchPhase !== "second_half"}
                onClick={onFullTime}
              >
                FT
              </Button>
            </div>
          </aside>
        ) : null}

        {surfaceMode === "STATS" ? (
          <>
            <div className="pointer-events-none absolute left-2 right-2 top-[max(2.2rem,calc(env(safe-area-inset-top)+1.55rem))] z-40 md:hidden">
              <div className="pointer-events-auto rounded-xl border border-white/10 bg-[rgba(16,24,41,0.78)] px-3 py-2 backdrop-blur-md">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/90">
                    {formatMatchPhaseLabel(matchPhase)}
                  </p>
                  <p className="text-[11px] font-semibold tabular-nums text-stone-100">
                    {matchClockDisplay}
                  </p>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-[max(0.9rem,env(safe-area-inset-bottom))] right-[max(0.65rem,env(safe-area-inset-right))] z-50 md:hidden">
              <Drawer open={mobileStatsDrawerOpen} onOpenChange={setMobileStatsDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="pointer-events-auto min-h-10 rounded-full border border-white/20 bg-[rgba(32,44,69,0.92)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-100 shadow-[0_12px_28px_-20px_rgba(0,0,0,0.9)]"
                  >
                    Controls
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="md:hidden">
                  <DrawerHeader>
                    <DrawerTitle>Stats controls</DrawerTitle>
                    <DrawerDescription>
                      Match workflow controls for phone view.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="max-h-[calc(82dvh-4.25rem)] space-y-2.5 overflow-y-auto px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Match control</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-stone-200/80">
                          {formatMatchPhaseLabel(matchPhase)} ·{" "}
                          {matchClockRunning ? "running" : "stopped"}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={matchPhase !== "pre_match"}
                            onClick={onStartMatch}
                          >
                            Start
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={
                              !matchClockRunning ||
                              (matchPhase !== "first_half" && matchPhase !== "second_half")
                            }
                            onClick={onStopMatch}
                          >
                            Pause
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={
                              matchClockRunning ||
                              (matchPhase !== "first_half" && matchPhase !== "second_half")
                            }
                            onClick={onResumeMatch}
                          >
                            Resume
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={matchPhase !== "first_half"}
                            onClick={onHalfTime}
                          >
                            HT
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={matchPhase !== "halftime"}
                            onClick={onStartSecondHalf}
                          >
                            2H
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={matchPhase !== "second_half"}
                            onClick={onFullTime}
                          >
                            FT
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Mode / review</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-1.5">
                          {STATS_REVIEW_CHIPS.map(({ mode, label }) => (
                            <Button
                              key={mode}
                              type="button"
                              variant="secondary"
                              className={cn(
                                mobileActionBtnClass,
                                reviewMode === mode &&
                                  "border-amber-300/55 bg-[rgba(98,80,46,0.72)] text-amber-50",
                              )}
                              aria-pressed={reviewMode === mode}
                              onClick={() => setReviewMode(mode)}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        {!isStatsLive ? (
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-300/85">
                              Spatial filter
                            </p>
                            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-0.5">
                              {PITCH_VIEW_FILTER_CHIPS.map(({ id, label }) => (
                                <Button
                                  key={id}
                                  type="button"
                                  variant="secondary"
                                  className={cn(
                                    "min-h-8 rounded-md px-2 py-1 text-[9px]",
                                    pitchMarkerViewFilter === id &&
                                      "border-amber-300/55 bg-[rgba(98,80,46,0.72)] text-amber-50",
                                  )}
                                  aria-pressed={pitchMarkerViewFilter === id}
                                  onClick={() => setPitchMarkerViewFilter(id)}
                                >
                                  {label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Scorer</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        <p className="text-[10px] text-stone-200/80">
                          Active scorer:{" "}
                          <span className="font-semibold text-stone-100">
                            {activeScorerPlayer
                              ? `#${activeScorerPlayer.number} ${activeScorerPlayer.name}`
                              : "No player"}
                          </span>
                        </p>
                        {pendingScoreLabel ? (
                          <p className="rounded-md border border-amber-300/40 bg-amber-500/15 px-2 py-1 text-[9px] font-semibold text-amber-100/95">
                            {pendingScoreLabel}
                          </p>
                        ) : null}
                        <div className="grid max-h-36 grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
                          <Button
                            type="button"
                            variant="secondary"
                            className={cn(
                              mobileActionBtnClass,
                              activeScorerId == null &&
                                "border-emerald-300/60 bg-emerald-600/25 text-emerald-50",
                            )}
                            aria-pressed={activeScorerId == null}
                            onClick={() => setActiveScorer(null)}
                          >
                            No player
                          </Button>
                          {statsPlayers.map((p) => (
                            <Button
                              key={p.id}
                              type="button"
                              variant="secondary"
                              className={cn(
                                mobileActionBtnClass,
                                activeScorerId === p.id &&
                                  "border-emerald-300/60 bg-emerald-600/25 text-emerald-50",
                              )}
                              aria-pressed={activeScorerId === p.id}
                              onClick={() => setActiveScorer(p.id)}
                            >
                              #{p.number} {p.name}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Voice</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <StatsVoiceStrip
                          allowRecording={canStatsPitchLog}
                          isRecording={recorder.isRecording}
                          recordError={voiceError}
                          onStartRecord={() => void onStartVoice()}
                          onStopRecord={() => void onStopVoice()}
                          pendingVoiceId={pendingVoiceId}
                          canAttachToLastEvent={Boolean(lastStatsEvent && pendingVoiceId)}
                          onAttachToLastEvent={onAttachVoiceToLastEvent}
                          onAttachAsMoment={onAttachVoiceAsMoment}
                          onDiscardPending={onDiscardPendingVoice}
                          voiceMomentIds={voiceMomentIds}
                          eventsWithVoice={eventsWithVoice}
                          onPlay={playVoiceNote}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Recent events</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {recentStatsEvents.length === 0 ? (
                          <p className="text-[10px] text-stone-300/75">No events logged yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {recentStatsEvents.map((event) => {
                              const scorer =
                                event.playerId != null
                                  ? statsPlayers.find((p) => p.id === event.playerId) ?? null
                                  : null;
                              return (
                                <li
                                  key={event.id}
                                  className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[9px] text-stone-200/85"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-stone-100/95">
                                      {kindUiLabel(event.kind)}
                                    </span>
                                    <span className="uppercase text-stone-300/70">
                                      {event.periodPhase.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  {scorer ? (
                                    <p className="mt-0.5 text-[8.5px] text-stone-300/80">
                                      #{scorer.number} {scorer.name}
                                    </p>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <p className="text-[9px] tabular-nums text-stone-300/65">
                          Logged: {statsEventsForReviewWindow.length}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Quick actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={!canStatsPitchLog}
                            onClick={() => clearArm()}
                          >
                            Clear
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={!canStatsPitchLog || statsEvents.length === 0}
                            onClick={() => undoLastEvent()}
                          >
                            Undo
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className={mobileActionBtnClass}
                            disabled={statsEvents.length === 0}
                            onClick={() => resetEvents()}
                          >
                            Reset
                          </Button>
                        </div>
                        {statsPersistError ? (
                          <p className="rounded border border-red-500/35 bg-red-950/40 px-2 py-1 text-[9px] text-red-100/95">
                            Save failed: {statsPersistError}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>More / context</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        <div className="space-y-1">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-300/85">
                            Surface
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button
                              type="button"
                              variant="secondary"
                              className={mobileActionBtnClass}
                              aria-pressed={false}
                              onClick={() => setMode("SIMULATOR")}
                            >
                              Sim
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className={cn(
                                mobileActionBtnClass,
                                "border-emerald-300/60 bg-emerald-600/25 text-emerald-50",
                              )}
                              aria-pressed
                              onClick={() => setMode("STATS")}
                            >
                              Stats
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-300/85">
                            Pitch
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {PITCH_OPTIONS.map((opt) => (
                              <Button
                                key={opt.id}
                                type="button"
                                variant="secondary"
                                className={cn(
                                  mobileActionBtnClass,
                                  sport === opt.id &&
                                    "border-emerald-300/60 bg-emerald-600/25 text-emerald-50",
                                )}
                                aria-pressed={sport === opt.id}
                                onClick={() => setSport(opt.id)}
                              >
                                {opt.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </>
        ) : null}

        <aside
          ref={utilityWrapRef}
          className={cn(
            "pointer-events-none absolute z-40 flex-col items-end",
            surfaceMode === "STATS" ? "hidden md:flex" : "flex",
          )}
          style={{
            top: "max(0.55rem, env(safe-area-inset-top))",
            right: "max(0.45rem, env(safe-area-inset-right))",
            bottom: "max(0.55rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            aria-label={utilityOpen ? "Close utility menu" : "Open utility menu"}
            aria-expanded={utilityOpen}
            className={`simulator-utility-trigger pointer-events-auto ml-auto inline-flex size-11 items-center justify-center rounded-full border transition duration-150 ${
              utilityOpen ? "is-open text-amber-50" : "text-slate-100"
            }`}
            onClick={() => setUtilityOpen((v) => !v)}
          >
            <SlidersHorizontal className="size-5" />
          </button>
          <div
            className={`simulator-utility-panel mt-1.5 origin-top-right overflow-y-auto rounded-[16px] p-2 transition duration-150 ${
              utilityOpen
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-[0.96] opacity-0"
            }`}
            style={{
              width:
                "min(17rem, calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 0.7rem))",
              maxHeight: "min(72dvh, calc(100% - 3rem))",
            }}
          >
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                  Mode
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                    aria-pressed={surfaceMode === "SIMULATOR"}
                    onClick={() => setMode("SIMULATOR")}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                    aria-pressed={surfaceMode === "STATS"}
                    onClick={() => setMode("STATS")}
                  >
                    Stats
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                  Pitch
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {PITCH_OPTIONS.map((opt) => (
                    <Button
                      key={opt.id}
                      type="button"
                      variant="secondary"
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      aria-pressed={sport === opt.id}
                      onClick={() => setSport(opt.id)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {surfaceMode === "SIMULATOR" ? (
                <div className="space-y-1">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                    Capture
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      aria-pressed={pathRecording}
                      onClick={() => setMainRecording(!pathRecording)}
                    >
                      Path
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      aria-pressed={shadowRecording}
                      onClick={() => setShadowLineRecording(!shadowRecording)}
                    >
                      Shadow
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      onClick={onExportPitchPng}
                    >
                      Export
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      onClick={onSharePitchPng}
                    >
                      Share
                    </Button>
                  </div>
                  {pitchExportError ? (
                    <p role="status" className="text-[9px] text-amber-200/90">
                      {pitchExportError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[9px] text-stone-200/80">
                    {formatMatchPhaseLabel(matchPhase)} ·{" "}
                    {matchClockRunning ? "running" : "stopped"}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Review
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {STATS_REVIEW_CHIPS.map(({ mode, label }) => (
                        <button
                          key={mode}
                          type="button"
                          className={reviewChipClass(reviewMode === mode)}
                          onClick={() => setReviewMode(mode)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!isStatsLive ? (
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                        Spatial review
                      </p>
                      <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                        {PITCH_VIEW_FILTER_CHIPS.map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            className={reviewChipClass(pitchMarkerViewFilter === id)}
                            onClick={() => setPitchMarkerViewFilter(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      "space-y-1",
                      !canStatsPitchLog && "pointer-events-none opacity-45",
                    )}
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Field
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {STATS_V1_FIELD_KINDS.map((k) => (
                        <Button
                          key={k}
                          type="button"
                          variant="secondary"
                          className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                          aria-pressed={statsArm === k}
                          onClick={() => armKind(k)}
                        >
                          {kindUiLabel(k)}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Score
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {STATS_V1_SCORE_KINDS.map((k) => (
                        <Button
                          key={k}
                          type="button"
                          variant="secondary"
                          className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                          aria-pressed={statsArm === k}
                          onClick={() => armKind(k)}
                        >
                          {kindUiLabel(k)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <StatsScorerStrip
                    players={statsPlayers}
                    pendingLabel={pendingScoreLabel}
                    activeScorerId={activeScorerId}
                    onSetActiveScorer={setActiveScorer}
                  />

                  <div className="space-y-1 border-t border-white/10 pt-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Players ({statsPlayers.length}/15)
                    </p>
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {statsPlayers.map((p) => (
                        <div
                          key={p.id}
                          className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[9px] text-stone-100/90"
                        >
                          <span className="mr-1 font-bold text-stone-200/80">#{p.number}</span>
                          {p.name}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        value={playerNumberDraft}
                        onChange={(e) => setPlayerNumberDraft(e.target.value)}
                        placeholder="#"
                        className="min-w-0 w-12 rounded border border-white/15 bg-black/30 px-2 py-1 text-[10px] text-stone-100 outline-none focus:border-white/30"
                      />
                      <input
                        value={playerNameDraft}
                        onChange={(e) => setPlayerNameDraft(e.target.value)}
                        placeholder="Player name"
                        className="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-2 py-1 text-[10px] text-stone-100 outline-none focus:border-white/30"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        disabled={statsPlayers.length >= 15}
                        onClick={onAddStatsPlayer}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <StatsVoiceStrip
                    allowRecording={canStatsPitchLog}
                    isRecording={recorder.isRecording}
                    recordError={voiceError}
                    onStartRecord={() => void onStartVoice()}
                    onStopRecord={() => void onStopVoice()}
                    pendingVoiceId={pendingVoiceId}
                    canAttachToLastEvent={Boolean(lastStatsEvent && pendingVoiceId)}
                    onAttachToLastEvent={onAttachVoiceToLastEvent}
                    onAttachAsMoment={onAttachVoiceAsMoment}
                    onDiscardPending={onDiscardPendingVoice}
                    voiceMomentIds={voiceMomentIds}
                    eventsWithVoice={eventsWithVoice}
                    onPlay={playVoiceNote}
                  />

                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      disabled={!canStatsPitchLog}
                      onClick={() => clearArm()}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      disabled={!canStatsPitchLog || statsEvents.length === 0}
                      onClick={() => undoLastEvent()}
                    >
                      Undo
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      disabled={statsEvents.length === 0}
                      onClick={() => resetEvents()}
                    >
                      Reset
                    </Button>
                  </div>

                  <p className="text-[9px] tabular-nums text-stone-300/65">
                    Logged: {statsEventsForReviewWindow.length}
                  </p>
                  {statsPersistError ? (
                    <p className="rounded border border-red-500/35 bg-red-950/40 px-2 py-1 text-[9px] text-red-100/95">
                      Save failed: {statsPersistError}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        .simulator-direct .simulator-transport-strip {
          border: 1px solid rgba(186, 198, 234, 0.22);
          background: linear-gradient(
            180deg,
            rgba(32, 44, 69, 0.74) 0%,
            rgba(20, 28, 47, 0.72) 100%
          );
          box-shadow: 0 14px 34px -24px rgba(0, 0, 0, 0.82);
        }

        .simulator-direct .simulator-live-rail {
          border: 1px solid rgba(177, 191, 227, 0.22);
          background: linear-gradient(
            180deg,
            rgba(38, 52, 80, 0.64) 0%,
            rgba(23, 33, 54, 0.6) 100%
          );
          box-shadow: 0 16px 34px -26px rgba(0, 0, 0, 0.82);
        }

        .simulator-direct .simulator-live-rail-chip {
          border: 1px solid rgba(175, 191, 226, 0.24) !important;
          background: rgba(68, 84, 122, 0.5) !important;
          color: #eef2ff !important;
          box-shadow: 0 6px 16px -14px rgba(0, 0, 0, 0.72);
        }

        .simulator-direct .simulator-utility-trigger {
          border-color: rgba(170, 188, 228, 0.46);
          background: linear-gradient(
            180deg,
            rgba(38, 54, 84, 0.92) 0%,
            rgba(23, 34, 56, 0.9) 100%
          );
          box-shadow:
            0 10px 24px -18px rgba(0, 0, 0, 0.85),
            0 0 0 1px rgba(148, 163, 184, 0.26);
        }

        .simulator-direct .simulator-utility-trigger.is-open {
          border-color: rgba(245, 207, 120, 0.66);
          box-shadow:
            0 0 0 1px rgba(245, 207, 120, 0.28),
            0 14px 30px -20px rgba(217, 145, 26, 0.6);
        }

        .simulator-direct .simulator-utility-panel {
          border: 1px solid rgba(177, 191, 227, 0.26);
          background: linear-gradient(
            180deg,
            rgba(37, 50, 78, 0.8) 0%,
            rgba(22, 32, 53, 0.76) 100%
          );
          box-shadow:
            0 20px 44px -28px rgba(0, 0, 0, 0.86),
            0 0 0 1px rgba(148, 163, 184, 0.14),
            0 0 18px -14px rgba(250, 204, 21, 0.34);
        }
      `}</style>
    </div>
  );
}
