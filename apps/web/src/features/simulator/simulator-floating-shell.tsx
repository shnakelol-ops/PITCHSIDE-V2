// <!-- redeploy trigger -->
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
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

  const onStatsEventLogged = useCallback((event: StatsLoggedEvent) => {
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
  }, []);

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

  return (
    <div className="relative h-[100dvh] min-h-0 overflow-hidden bg-[#0b0f0c] text-stone-100">
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
        <div className="pointer-events-none absolute bottom-[max(0.55rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/15 bg-black/70 px-2 py-1">
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
            className="pointer-events-none absolute left-[max(0.45rem,env(safe-area-inset-left))] top-1/2 z-40 -translate-y-1/2"
            aria-label="Live matchday rail"
          >
            <div className="pointer-events-auto flex w-[3.6rem] flex-col items-stretch gap-1 rounded-2xl border border-white/15 bg-black/70 p-1.5">
              <Button
                type="button"
                variant="secondary"
                className="min-h-9 rounded-xl border border-white/15 bg-black/45 px-1 py-1 text-[9px] font-semibold text-stone-100"
                aria-pressed={reviewMode === "live"}
                onClick={() => setReviewMode("live")}
              >
                {matchClockDisplay}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-8 rounded-lg border border-white/15 bg-black/45 px-1 py-1 text-[9px] font-semibold text-stone-100"
                disabled={matchPhase !== "first_half"}
                onClick={onHalfTime}
              >
                HT
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-8 rounded-lg border border-white/15 bg-black/45 px-1 py-1 text-[9px] font-semibold text-stone-100"
                disabled={matchPhase !== "halftime"}
                onClick={onStartSecondHalf}
              >
                2H
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-8 rounded-lg border border-white/15 bg-black/45 px-1 py-1 text-[9px] font-semibold text-stone-100"
                disabled={matchPhase !== "second_half"}
                onClick={onFullTime}
              >
                FT
              </Button>
            </div>
          </aside>
        ) : null}

        <aside
          className="pointer-events-none absolute z-40 flex flex-col items-end"
          style={{
            top: "max(0.55rem, env(safe-area-inset-top))",
            right: "max(0.45rem, env(safe-area-inset-right))",
            bottom: "max(0.55rem, env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="pointer-events-auto max-h-full overflow-y-auto rounded-[16px] border border-white/15 bg-black/75 p-2"
            style={{
              width:
                "min(17rem, calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 0.7rem))",
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
    </div>
  );
}
