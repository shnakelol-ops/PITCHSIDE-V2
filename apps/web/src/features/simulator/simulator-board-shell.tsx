"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { normalizeMatchPeriod } from "@/components/match/MatchMode";
import { Button } from "@/components/ui/button";
import type { PitchSport } from "@/config/pitchConfig";
import {
  downloadPitchCanvasPng,
  shareOrDownloadPitchPng,
} from "@/lib/pitch-canvas-export";
import { persistSimulatorPhaseChange } from "@/lib/persist-simulator-phase-change";
import { persistSimulatorStatsEvent } from "@/lib/persist-simulator-stats-event";
import { MatchPeriod } from "@pitchside/data-access";
import {
  SimulatorPixiSurface,
  type SimulatorPixiSurfaceHandle,
  type SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
import { StatsScorerStrip } from "@src/features/stats/controls/stats-scorer-strip";
import { StatsVoiceStrip } from "@src/features/stats/controls/stats-voice-strip";
import { useStatsEventLog } from "@src/features/stats/hooks/use-stats-event-log";
import {
  formatSimulatorClockDisplay,
  type SimulatorMatchPhase,
  useSimulatorMatchClock,
} from "@src/features/stats/hooks/use-simulator-match-clock";
import { useStatsVoiceRecorder } from "@src/features/stats/hooks/use-stats-voice-recorder";
import { findLatestScorePendingScorer } from "@src/features/stats/model/stats-scorer-utils";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import {
  isStatsV1ScoreKind,
  STATS_V1_EVENT_KINDS,
  STATS_V1_FIELD_KINDS,
  STATS_V1_SCORE_KINDS,
  type StatsV1EventKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import { STATS_DEV_PLACEHOLDER_ROSTER } from "@src/features/stats/types/stats-roster";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

const STATS_REVIEW_CHIPS: { mode: StatsReviewMode; label: string }[] = [
  { mode: "live", label: "Live" },
  { mode: "halftime", label: "Review · HT" },
  { mode: "full_time", label: "Review · FT" },
];

/** Visual-only pitch dot filter (review); does not change stored events. */
type PitchMarkerViewFilter = "all" | StatsV1EventKind;

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

const SPORT_OPTIONS: { id: PitchSport; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic" },
  { id: "hurling", label: "Hurling" },
];

/** Chalk / cream line at pitch boundary — soft, not stark white. */
const CHALK_LINE = "rgba(252, 248, 240, 0.52)";

/** Canvas well only (Pixi aperture). Floating UI uses warm glass, not flat grey panels. */
const C = {
  canvasWell: "#0b0f0c",
};

/**
 * Sidebar control pods only — dark smoked glass, minimal blur (keeps pitch sharp).
 * Not used on the pitch aperture / apron.
 */
const GLASS_SIDEBAR = {
  bg: "rgba(18, 20, 24, 0.58)",
  border: "rgba(255, 252, 248, 0.085)",
  title: "rgba(228, 226, 220, 0.72)",
  shadow:
    "0 4px 24px -4px rgba(0, 0, 0, 0.35), 0 12px 40px -16px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
};

const btnBase =
  "min-h-10 w-full justify-center rounded-[11px] px-3 py-2.5 text-[12px] font-medium leading-tight tracking-[0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.35)] transition-[transform,box-shadow,background-color,border-color,color] duration-200 sm:min-h-9 sm:py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(18,20,24,0.9)] active:translate-y-px active:shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]";

const btnIdle =
  "!border !border-white/[0.07] !bg-[rgba(32,34,40,0.88)] !text-[rgba(245,243,238,0.94)] hover:!border-white/[0.1] hover:!bg-[rgba(38,40,48,0.92)] hover:!text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_12px_-4px_rgba(0,0,0,0.4)]";

const btnSportOn =
  "!border !border-emerald-500/25 !bg-[rgba(28,42,36,0.92)] !text-[rgba(236,253,245,0.96)] hover:!border-emerald-400/35 hover:!bg-[rgba(32,48,40,0.95)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";

const btnRecordOn =
  "!border !border-amber-500/22 !bg-[rgba(48,38,28,0.9)] !text-[rgba(255,251,235,0.96)] hover:!border-amber-400/32 hover:!bg-[rgba(54,44,32,0.94)]";

const btnShadowOn =
  "!border !border-slate-400/18 !bg-[rgba(36,38,44,0.9)] !text-[rgba(248,250,252,0.95)] hover:!border-slate-300/22 hover:!bg-[rgba(42,44,52,0.94)]";

const btnReviewOn =
  "!border !border-amber-500/28 !bg-[rgba(48,40,28,0.88)] !text-[rgba(255,251,235,0.96)] hover:!border-amber-400/35";

function reviewChipClass(active: boolean) {
  return cn(
    "min-h-8 rounded-lg border px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide",
    btnBase,
    active ? btnReviewOn : btnIdle,
  );
}

function ToolRail({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0 rounded-[14px] border p-3.5 backdrop-blur-sm",
        className,
      )}
      style={{
        backgroundColor: GLASS_SIDEBAR.bg,
        borderColor: GLASS_SIDEBAR.border,
        boxShadow: GLASS_SIDEBAR.shadow,
      }}
    >
      <div className="flex items-baseline gap-2 border-b border-white/[0.055] pb-2.5">
        <span
          className="mt-0.5 size-1 shrink-0 rounded-full bg-[rgba(180,200,188,0.25)] ring-1 ring-white/[0.07]"
          aria-hidden
        />
        <div
          className="font-[system-ui,-apple-system,'Segoe_UI',sans-serif] text-[9.5px] font-semibold uppercase leading-none tracking-[0.28em] text-[rgba(228,226,220,0.78)]"
          style={{ fontFeatureSettings: '"ss01" 1' }}
        >
          {title}
        </div>
      </div>
      <div className="flex flex-col gap-2 pt-3">{children}</div>
    </div>
  );
}

/**
 * Board-centred coaching console — worn natural grass surround only (no Pixi / pitch edits).
 */
function kindUiLabel(kind: string): string {
  return kind.replace(/_/g, " ").toLowerCase();
}

function matchMorphLabel(phase: SimulatorMatchPhase): string {
  switch (phase) {
    case "pre_match":
      return "Start Match";
    case "first_half":
      return "Half Time";
    case "halftime":
      return "Start 2nd Half";
    case "second_half":
      return "Full Time";
    case "full_time":
      return "Match ended";
  }
}

export type SimulatorBoardShellProps = {
  initialSurfaceMode?: SimulatorSurfaceMode;
  /** When set (e.g. `?matchId=` on `/simulator`), new STATS logs POST to `/api/events`. */
  linkedMatchId?: string | null;
};

export function SimulatorBoardShell({
  initialSurfaceMode = "SIMULATOR",
  linkedMatchId = null,
}: SimulatorBoardShellProps = {}) {
  const [sport, setSport] = useState<PitchSport>("gaelic");
  const [pathRecording, setPathRecording] = useState(false);
  const [shadowRecording, setShadowRecording] = useState(false);
  const [surfaceMode, setSurfaceMode] =
    useState<SimulatorSurfaceMode>(initialSurfaceMode);
  useEffect(() => {
    setSurfaceMode(initialSurfaceMode);
    if (initialSurfaceMode === "STATS") {
      setPathRecording(false);
      setShadowRecording(false);
    }
  }, [initialSurfaceMode]);
  const surfaceRef = useRef<SimulatorPixiSurfaceHandle>(null);
  const pitchHostRef = useRef<HTMLDivElement>(null);
  const linkedMatchIdRef = useRef<string | null>(null);
  linkedMatchIdRef.current = linkedMatchId;

  const [linkedMatchPeriod, setLinkedMatchPeriod] = useState<MatchPeriod>(
    MatchPeriod.FIRST_HALF,
  );
  const linkedMatchPeriodRef = useRef(linkedMatchPeriod);
  linkedMatchPeriodRef.current = linkedMatchPeriod;

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
        if (p != null) setLinkedMatchPeriod(normalizeMatchPeriod(p));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedMatchId]);

  const [statsPersistError, setStatsPersistError] = useState<string | null>(
    null,
  );
  const [clearLogConfirmOpen, setClearLogConfirmOpen] = useState(false);
  const persistErrorClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (persistErrorClearTimerRef.current != null) {
        clearTimeout(persistErrorClearTimerRef.current);
        persistErrorClearTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (surfaceMode !== "STATS") {
      setClearLogConfirmOpen(false);
    }
  }, [surfaceMode]);

  const matchClock = useSimulatorMatchClock(surfaceMode === "STATS");
  const {
    phase: matchPhase,
    setPhase: setMatchPhase,
    firstHalfSec,
    secondHalfSec,
    clockLabelRef: matchClockLabelRef,
  } = matchClock;

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
      const message =
        err instanceof Error ? err.message : "Couldn’t save event.";
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
  } = useStatsEventLog({ onStatsEventLogged });

  const recorder = useStatsVoiceRecorder();
  const [pendingVoiceId, setPendingVoiceId] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [pitchExportError, setPitchExportError] = useState<string | null>(null);
  const [pitchMarkerViewFilter, setPitchMarkerViewFilter] =
    useState<PitchMarkerViewFilter>("all");

  const isStatsLive = reviewMode === "live";

  const canStatsPitchLog =
    reviewMode === "live" &&
    (matchPhase === "first_half" || matchPhase === "second_half");

  const matchClockDisplay = useMemo(
    () =>
      formatSimulatorClockDisplay(
        matchPhase,
        firstHalfSec,
        secondHalfSec,
      ),
    [matchPhase, firstHalfSec, secondHalfSec],
  );

  const onMatchMorph = useCallback(() => {
    const mid = linkedMatchIdRef.current;
    const label = matchClockLabelRef.current;
    const failPhase = (err: unknown) => {
      console.error("[simulator-stats] phase persist failed", err);
      const message =
        err instanceof Error ? err.message : "Couldn’t save phase.";
      setStatsPersistError(`Phase: ${message}`);
      if (persistErrorClearTimerRef.current != null) {
        clearTimeout(persistErrorClearTimerRef.current);
      }
      persistErrorClearTimerRef.current = setTimeout(() => {
        setStatsPersistError(null);
        persistErrorClearTimerRef.current = null;
      }, 8000);
    };
    const post = (p: MatchPeriod) => {
      if (!mid) return Promise.resolve();
      return persistSimulatorPhaseChange({
        matchId: mid,
        matchPeriod: p,
        clockLabel: label,
      });
    };

    switch (matchPhase) {
      case "pre_match":
        setMatchPhase("first_half");
        setReviewMode("live");
        linkedMatchPeriodRef.current = MatchPeriod.FIRST_HALF;
        setLinkedMatchPeriod(MatchPeriod.FIRST_HALF);
        void post(MatchPeriod.FIRST_HALF).catch(failPhase);
        break;
      case "first_half":
        setMatchPhase("halftime");
        setReviewMode("halftime");
        linkedMatchPeriodRef.current = MatchPeriod.HALF_TIME;
        setLinkedMatchPeriod(MatchPeriod.HALF_TIME);
        void post(MatchPeriod.HALF_TIME).catch(failPhase);
        break;
      case "halftime":
        setMatchPhase("second_half");
        setReviewMode("live");
        linkedMatchPeriodRef.current = MatchPeriod.SECOND_HALF;
        setLinkedMatchPeriod(MatchPeriod.SECOND_HALF);
        void post(MatchPeriod.SECOND_HALF).catch(failPhase);
        break;
      case "second_half":
        setMatchPhase("full_time");
        setReviewMode("full_time");
        linkedMatchPeriodRef.current = MatchPeriod.FULL_TIME;
        setLinkedMatchPeriod(MatchPeriod.FULL_TIME);
        void post(MatchPeriod.FULL_TIME).catch(failPhase);
        break;
      default:
        break;
    }
  }, [matchPhase, setMatchPhase, setReviewMode, setLinkedMatchPeriod]);

  useEffect(() => {
    if (canStatsPitchLog) setPitchMarkerViewFilter("all");
  }, [canStatsPitchLog]);

  const statsEventsForPitchView = useMemo(() => {
    if (isStatsLive || pitchMarkerViewFilter === "all") return statsEvents;
    return statsEvents.filter((e) => e.kind === pitchMarkerViewFilter);
  }, [statsEvents, isStatsLive, pitchMarkerViewFilter]);
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
  }, [surfaceMode, statsArm, armKind]);

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
    <div
      className="simulator-shell relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0b0f0c] text-stone-200"
    >
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-stone-300/65">
            Pitchside
          </p>
          <h1 className="truncate text-base font-semibold tracking-tight text-stone-100/95 sm:text-[17px]">
            Match simulator
          </h1>
          <p className="hidden text-[11px] text-stone-300/60 sm:block">
            Field view — training strip in natural grass.
          </p>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-center lg:gap-8 lg:px-10 lg:py-6 xl:gap-12 xl:px-14">
        <aside className="order-2 flex shrink-0 flex-row gap-3.5 lg:order-1 lg:w-[11.5rem] lg:flex-col lg:justify-center lg:gap-4">
          <ToolRail title="Transport" className="min-w-0 flex-1 lg:flex-none">
            <div
              className="grid grid-cols-3 gap-2 lg:grid-cols-1"
              role="group"
              aria-label="Playback transport"
            >
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, btnIdle)}
                onClick={() => surfaceRef.current?.play()}
              >
                Play
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, btnIdle)}
                onClick={() => surfaceRef.current?.pause()}
              >
                Pause
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, btnIdle)}
                onClick={() => surfaceRef.current?.reset()}
              >
                Reset
              </Button>
            </div>
          </ToolRail>
        </aside>

        <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center lg:order-2 lg:max-w-[min(96vw,74rem)]">
          <div className="relative w-full max-w-full px-1 sm:px-2">
            <div
              className="relative overflow-hidden rounded-[1.2rem] p-2 sm:p-2.5"
              style={{
                backgroundColor: "#0b0f0c",
                boxShadow:
                  "0 28px 64px -24px rgba(22, 26, 16, 0.22), 0 12px 32px -18px rgba(22, 26, 16, 0.12)",
              }}
            >
              <div
                className="relative z-10 overflow-hidden rounded-[1.05rem] p-1 sm:p-1.5"
                style={{
                  backgroundColor: "#0b0f0c",
                }}
              >
                <div
                  ref={pitchHostRef}
                  className={cn(
                    "relative overflow-hidden rounded-xl",
                    surfaceMode === "STATS" &&
                      !canStatsPitchLog &&
                      "ring-2 ring-amber-400/35 ring-offset-0",
                  )}
                  style={{
                    backgroundColor: C.canvasWell,
                    boxShadow: [
                      `inset 0 0 0 1px ${CHALK_LINE}`,
                      `inset 0 0 0 2px rgba(111, 143, 90, 0.78)`,
                      "inset 0 0 0 3px rgba(159, 175, 122, 0.14)",
                      "inset 0 14px 36px -4px rgba(0,0,0,0.26)",
                      "inset 0 5px 14px rgba(0,0,0,0.12)",
                      "0 0 8px rgba(38, 48, 30, 0.1)",
                      "0 0 18px rgba(32, 42, 26, 0.06)",
                    ].join(", "),
                  }}
                >
                  <SimulatorPixiSurface
                    ref={surfaceRef}
                    sport={sport}
                    recordingMode={surfaceMode === "STATS" ? false : pathRecording}
                    shadowRecordingMode={
                      surfaceMode === "STATS" ? false : shadowRecording
                    }
                    surfaceMode={surfaceMode}
                    statsArm={surfaceMode === "STATS" ? statsArm : null}
                    statsLoggedEvents={
                      surfaceMode === "STATS" ? statsEventsForPitchView : []
                    }
                    onStatsPitchTap={
                      surfaceMode === "STATS" && canStatsPitchLog
                        ? logTap
                        : undefined
                    }
                    statsReviewMode={reviewMode}
                    statsPitchInteractive={canStatsPitchLog}
                    className="max-h-[min(68dvh,calc(100dvw-2.5rem))] w-full !rounded-lg !border-0 !bg-transparent !shadow-none !ring-0 sm:max-h-[min(72dvh,80vw)] lg:max-h-[min(78dvh,58rem)]"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md px-3 text-center text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-stone-300/55 sm:mt-5 sm:text-[11px] sm:tracking-[0.16em]">
            {surfaceMode === "STATS"
              ? canStatsPitchLog
                ? "Pick event type · tap the pitch to log · same Pixi canvas as simulator"
                : "Review or pause · use match control to start / resume play · filters refine pitch dots"
              : "Select a player · draw on the pitch · transport on the left"}
          </p>
        </div>

        <aside className="order-3 flex shrink-0 flex-row flex-wrap gap-3.5 lg:w-[11.5rem] lg:flex-col lg:justify-center lg:gap-4">
          <ToolRail title="Mode" className="min-w-0 flex-1 basis-[48%] lg:basis-auto lg:flex-none">
            <div className="flex flex-col gap-2" role="group" aria-label="Canvas mode">
              <Button
                type="button"
                variant="secondary"
                className={cn(
                  btnBase,
                  surfaceMode === "SIMULATOR" ? btnSportOn : btnIdle,
                )}
                aria-pressed={surfaceMode === "SIMULATOR"}
                onClick={() => setMode("SIMULATOR")}
              >
                Simulator
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(
                  btnBase,
                  surfaceMode === "STATS" ? btnSportOn : btnIdle,
                )}
                aria-pressed={surfaceMode === "STATS"}
                onClick={() => setMode("STATS")}
              >
                Stats
              </Button>
            </div>
            {surfaceMode === "STATS" ? (
              <div
                className="mt-1 flex max-h-[min(70vh,28rem)] flex-col gap-2 overflow-y-auto pr-0.5"
                role="group"
                aria-label="Stats logging"
              >
                <div className="flex flex-wrap gap-1">
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
                <div className="flex flex-wrap items-end gap-2 border-b border-white/[0.06] pb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-semibold uppercase tracking-wide text-[rgba(228,226,220,0.5)]">
                      Clock
                    </p>
                    <p className="font-mono text-[11px] font-semibold tabular-nums text-emerald-100/90">
                      {matchClockDisplay}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={matchPhase === "full_time"}
                    className={cn(
                      "min-h-8 shrink-0 px-2 py-1.5 text-[9px]",
                      btnBase,
                      matchPhase === "full_time" ? btnIdle : btnSportOn,
                    )}
                    onClick={onMatchMorph}
                  >
                    {matchMorphLabel(matchPhase)}
                  </Button>
                </div>
                {statsPersistError ? (
                  <p
                    role="status"
                    className="rounded-md border border-red-500/30 bg-red-950/40 px-2 py-1.5 text-[9px] font-medium leading-snug text-red-100/95"
                  >
                    Save failed: {statsPersistError}
                  </p>
                ) : null}
                {!isStatsLive ? (
                  <div
                    className="flex max-h-28 flex-wrap gap-1 overflow-y-auto pr-0.5"
                    role="group"
                    aria-label="Pitch marker view"
                  >
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
                ) : null}
                <div
                  className={cn(
                    "flex flex-col gap-1.5",
                    !canStatsPitchLog && "pointer-events-none opacity-40",
                  )}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(228,226,220,0.55)]">
                    Field
                  </p>
                  <div className="flex flex-col gap-1">
                    {STATS_V1_FIELD_KINDS.map((k) => {
                      const on = statsArm === k;
                      return (
                        <Button
                          key={k}
                          type="button"
                          variant="secondary"
                          className={cn(
                            "min-h-8 py-1.5 text-[10px]",
                            btnBase,
                            on ? btnRecordOn : btnIdle,
                          )}
                          aria-pressed={on}
                          onClick={() => armKind(k)}
                        >
                          {kindUiLabel(k)}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(228,226,220,0.55)]">
                    Score
                  </p>
                  <div className="flex flex-col gap-1">
                    {STATS_V1_SCORE_KINDS.map((k) => {
                      const on = statsArm === k;
                      return (
                        <Button
                          key={k}
                          type="button"
                          variant="secondary"
                          className={cn(
                            "min-h-8 py-1.5 text-[10px]",
                            btnBase,
                            on ? btnRecordOn : btnIdle,
                          )}
                          aria-pressed={on}
                          onClick={() => armKind(k)}
                        >
                          {kindUiLabel(k)}
                        </Button>
                      );
                    })}
                  </div>
                  <StatsScorerStrip
                    players={STATS_DEV_PLACEHOLDER_ROSTER}
                    pendingLabel={pendingScoreLabel}
                    activeScorerId={activeScorerId}
                    onSetActiveScorer={setActiveScorer}
                  />
                  <StatsVoiceStrip
                    allowRecording={canStatsPitchLog}
                    isRecording={recorder.isRecording}
                    recordError={voiceError}
                    onStartRecord={() => void onStartVoice()}
                    onStopRecord={() => void onStopVoice()}
                    pendingVoiceId={pendingVoiceId}
                    canAttachToLastEvent={Boolean(
                      lastStatsEvent && pendingVoiceId,
                    )}
                    onAttachToLastEvent={onAttachVoiceToLastEvent}
                    onAttachAsMoment={onAttachVoiceAsMoment}
                    onDiscardPending={onDiscardPendingVoice}
                    voiceMomentIds={voiceMomentIds}
                    eventsWithVoice={eventsWithVoice}
                    onPlay={playVoiceNote}
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canStatsPitchLog}
                      className={cn("min-h-8 flex-1 py-1.5 text-[9px]", btnBase, btnIdle)}
                      onClick={() => clearArm()}
                    >
                      Clear arm
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canStatsPitchLog || statsEvents.length === 0}
                      className={cn("min-h-8 flex-1 py-1.5 text-[9px]", btnBase, btnIdle)}
                      onClick={() => undoLastEvent()}
                    >
                      Undo last
                    </Button>
                    {clearLogConfirmOpen ? (
                      <div className="w-full rounded-md border border-amber-500/25 bg-amber-950/35 px-2 py-2">
                        <p className="mb-1.5 text-[10px] font-medium text-amber-100/90">
                          Clear all events?
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            className={cn(
                              "min-h-8 flex-1 py-1.5 text-[9px]",
                              btnBase,
                              btnIdle,
                            )}
                            onClick={() => setClearLogConfirmOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className={cn(
                              "min-h-8 flex-1 py-1.5 text-[9px]",
                              btnBase,
                              btnRecordOn,
                            )}
                            onClick={() => {
                              resetEvents();
                              setClearLogConfirmOpen(false);
                            }}
                          >
                            Confirm
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className={cn(
                          "min-h-8 w-full py-1.5 text-[9px]",
                          btnBase,
                          btnIdle,
                        )}
                        disabled={statsEvents.length === 0}
                        onClick={() => setClearLogConfirmOpen(true)}
                      >
                        Clear log
                      </Button>
                    )}
                  </div>
                  <p className="text-[9px] tabular-nums text-[rgba(228,226,220,0.5)]">
                    Logged: {statsEvents.length}
                  </p>
                </div>
              </div>
            ) : null}
          </ToolRail>
          <ToolRail title="Pitch" className="min-w-0 flex-1 basis-[48%] lg:basis-auto lg:flex-none">
            <div className="flex flex-col gap-2" role="group" aria-label="Pitch sport">
              {SPORT_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  variant="secondary"
                  className={cn(
                    btnBase,
                    sport === opt.id ? btnSportOn : btnIdle,
                  )}
                  onClick={() => setSport(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </ToolRail>
          <ToolRail title="Capture" className="min-w-0 flex-1 basis-[48%] lg:basis-auto lg:flex-none">
            <div className="flex flex-col gap-2" role="group" aria-label="Path capture">
              <Button
                type="button"
                variant="secondary"
                disabled={surfaceMode === "STATS"}
                className={cn(btnBase, pathRecording ? btnRecordOn : btnIdle)}
                aria-pressed={pathRecording}
                onClick={() => setMainRecording(!pathRecording)}
              >
                {pathRecording ? "Recording path…" : "Record path"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={surfaceMode === "STATS"}
                className={cn(btnBase, shadowRecording ? btnShadowOn : btnIdle)}
                aria-pressed={shadowRecording}
                onClick={() => setShadowLineRecording(!shadowRecording)}
              >
                {shadowRecording ? "Shadow line…" : "Shadow line"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, btnIdle)}
                onClick={onExportPitchPng}
              >
                Export pitch PNG
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, btnIdle)}
                onClick={onSharePitchPng}
              >
                Share pitch
              </Button>
              {pitchExportError ? (
                <p className="text-[9px] text-amber-200/90">{pitchExportError}</p>
              ) : null}
            </div>
          </ToolRail>
        </aside>
      </main>
    </div>
  );
}
