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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PitchSport } from "@/config/pitchConfig";
import { ChevronDown } from "lucide-react";
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
import type {
  StatsLoggedEvent,
  StatsPeriodPhase,
} from "@src/features/stats/model/stats-logged-event";
import {
  isStatsV1ScoreKind,
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

/**
 * Worn natural sideline grass (cricket-strip inspiration) — dry, uneven, not flat UI fill.
 * Spec palette: #9FAF7A, #AFA785, #8F9B6A.
 */
const GRASS = {
  fresh: "#9FAF7A",
  dry: "#AFA785",
  worn: "#8F9B6A",
};

/** Fractal noise for fine grain + slight patchiness; data URL via `encodeURIComponent`. */
const grassNoiseDataUrl = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="5" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

/** Softer noise for clay / apron — blurred in CSS for premium texture (not gritty). */
const clayNoiseDataUrl = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="c"><feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#c)"/></svg>',
)}")`;

/** Barely-there concentric curves — stadium lane memory, not a literal track. */
const laneCurvesDataUrl = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="384" viewBox="0 0 512 384" preserveAspectRatio="none"><ellipse cx="256" cy="198" rx="232" ry="158" fill="none" stroke="#3a3028" stroke-width="0.9" opacity="0.045"/><ellipse cx="256" cy="200" rx="210" ry="142" fill="none" stroke="#3a3028" stroke-width="0.85" opacity="0.034"/><ellipse cx="256" cy="202" rx="188" ry="126" fill="none" stroke="#3a3028" stroke-width="0.8" opacity="0.026"/><ellipse cx="256" cy="204" rx="166" ry="110" fill="none" stroke="#3a3028" stroke-width="0.75" opacity="0.02"/></svg>',
)}")`;

/** Chalk / cream line at pitch boundary — soft, not stark white. */
const CHALK_LINE = "rgba(252, 248, 240, 0.52)";

/** Canvas well only (Pixi aperture). Floating UI uses warm glass, not flat grey panels. */
const C = {
  canvasWell: "#1a1f16",
};

/**
 * Sidebar control pods only — dark smoked glass, minimal blur (keeps pitch sharp).
 * Not used on the pitch aperture / apron.
 */
const GLASS_SIDEBAR = {
  bg: "rgba(14, 17, 22, 0.72)",
  border: "rgba(148, 185, 230, 0.09)",
  title: "rgba(228, 232, 240, 0.72)",
  shadow:
    "inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 40px -16px rgba(0, 0, 0, 0.55), 0 4px 18px -10px rgba(0, 0, 0, 0.35)",
};

const btnBase =
  "min-h-10 w-full justify-center rounded-[10px] px-3 py-2.5 text-[12px] font-medium leading-tight tracking-[0.01em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)] transition-[transform,box-shadow,background-color,border-color,color] duration-150 sm:min-h-9 sm:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12] active:translate-y-px active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.32)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:!bg-[rgba(26,30,36,0.92)]";

const btnIdle =
  "!border !border-white/[0.06] !bg-[rgba(26,30,36,0.92)] !text-[rgba(235,238,244,0.92)] hover:!border-white/[0.12] hover:!bg-[rgba(34,38,46,0.96)] hover:!text-white";

const btnSportOn =
  "!border !border-emerald-400/28 !bg-[rgba(20,42,34,0.92)] !text-[rgba(209,250,229,0.96)] hover:!border-emerald-300/38 hover:!bg-[rgba(24,48,38,0.95)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(16,185,129,0.08)]";

const btnRecordOn =
  "!border !border-amber-400/24 !bg-[rgba(48,36,20,0.9)] !text-[rgba(254,243,199,0.96)] hover:!border-amber-300/34 hover:!bg-[rgba(54,40,22,0.94)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

const btnShadowOn =
  "!border !border-slate-300/20 !bg-[rgba(36,40,48,0.9)] !text-[rgba(248,250,252,0.95)] hover:!border-slate-200/28 hover:!bg-[rgba(42,46,56,0.94)]";

const btnReviewOn =
  "!border !border-amber-400/28 !bg-[rgba(48,40,22,0.88)] !text-[rgba(254,243,199,0.96)] hover:!border-amber-300/38 hover:!bg-[rgba(54,44,24,0.92)]";

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
        "relative flex flex-col gap-0 overflow-hidden rounded-[14px] border px-3 py-3 backdrop-blur-[6px]",
        className,
      )}
      style={{
        backgroundColor: GLASS_SIDEBAR.bg,
        borderColor: GLASS_SIDEBAR.border,
        boxShadow: GLASS_SIDEBAR.shadow,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(148,185,230,0.2) 50%, transparent 100%)",
        }}
        aria-hidden
      />
      <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
        <span
          className="h-3 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-[rgba(90,167,255,0.55)] to-[rgba(90,167,255,0.12)]"
          aria-hidden
        />
        <div
          className="text-[9.5px] font-semibold uppercase leading-none tracking-[0.26em] text-[rgba(228,232,240,0.82)]"
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

function matchPhaseToStatsPeriodPhase(phase: SimulatorMatchPhase): StatsPeriodPhase {
  switch (phase) {
    case "first_half":
      return "first_half";
    case "second_half":
      return "second_half";
    case "halftime":
      return "half_time";
    case "full_time":
      return "full_time";
    default:
      return "unspecified";
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
  const [modeBubbleOpen, setModeBubbleOpen] = useState(false);
  const [pitchBubbleOpen, setPitchBubbleOpen] = useState(false);
  const [reviewBubbleOpen, setReviewBubbleOpen] = useState(false);
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
    running: matchClockRunning,
    setRunning: setMatchClockRunning,
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

  const resolveCurrentPeriodPhase = useCallback(
    () => matchPhaseToStatsPeriodPhase(matchPhase),
    [matchPhase],
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
  const [pendingVoiceId, setPendingVoiceId] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [pitchExportError, setPitchExportError] = useState<string | null>(null);
  const [pitchMarkerViewFilter, setPitchMarkerViewFilter] =
    useState<PitchMarkerViewFilter>("all");
  const [statsPlayers, setStatsPlayers] = useState<StatsRosterPlayer[]>(
    STATS_DEV_PLACEHOLDER_ROSTER,
  );
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const [playerNumberDraft, setPlayerNumberDraft] = useState("");

  const isStatsLive = reviewMode === "live";

  const canStatsPitchLog =
    reviewMode === "live" &&
    (matchPhase === "first_half" || matchPhase === "second_half");
  const canStatsPitchLogRef = useRef(canStatsPitchLog);
  canStatsPitchLogRef.current = canStatsPitchLog;

  const onStatsPitchTapGuarded = useCallback(
    (payload: StatsPitchTapPayload) => {
      // Hard data-integrity guard: HT/FT (or any non-live/non-playing phase) must never log.
      if (!canStatsPitchLogRef.current) return;
      logTap(payload);
    },
    [logTap],
  );

  const matchClockDisplay = useMemo(
    () =>
      formatSimulatorClockDisplay(
        matchPhase,
        firstHalfSec,
        secondHalfSec,
      ),
    [matchPhase, firstHalfSec, secondHalfSec],
  );

  const persistPhase = useCallback((nextPeriod: MatchPeriod) => {
    const mid = linkedMatchIdRef.current;
    const label = matchClockLabelRef.current;
    if (!mid) return;
    void persistSimulatorPhaseChange({
      matchId: mid,
      matchPeriod: nextPeriod,
      clockLabel: label,
    }).catch((err: unknown) => {
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
    });
  }, []);

  const onStartMatch = useCallback(() => {
    setMatchPhase("first_half");
    setReviewMode("live");
    setMatchClockRunning(true);
    linkedMatchPeriodRef.current = MatchPeriod.FIRST_HALF;
    setLinkedMatchPeriod(MatchPeriod.FIRST_HALF);
    persistPhase(MatchPeriod.FIRST_HALF);
  }, [persistPhase, setMatchClockRunning, setMatchPhase, setReviewMode]);

  const onStopMatchClock = useCallback(() => {
    setMatchClockRunning(false);
  }, [setMatchClockRunning]);

  const onResumeMatchClock = useCallback(() => {
    if (matchPhase === "first_half" || matchPhase === "second_half") {
      setMatchClockRunning(true);
    }
  }, [matchPhase, setMatchClockRunning]);

  const onHalfTime = useCallback(() => {
    if (matchPhase !== "first_half") return;
    setMatchClockRunning(false);
    setMatchPhase("halftime");
    setReviewMode("halftime");
    linkedMatchPeriodRef.current = MatchPeriod.HALF_TIME;
    setLinkedMatchPeriod(MatchPeriod.HALF_TIME);
    persistPhase(MatchPeriod.HALF_TIME);
  }, [matchPhase, persistPhase, setMatchClockRunning, setMatchPhase, setReviewMode]);

  const onStartSecondHalf = useCallback(() => {
    if (matchPhase !== "halftime") return;
    setMatchPhase("second_half");
    setReviewMode("live");
    setMatchClockRunning(true);
    linkedMatchPeriodRef.current = MatchPeriod.SECOND_HALF;
    setLinkedMatchPeriod(MatchPeriod.SECOND_HALF);
    persistPhase(MatchPeriod.SECOND_HALF);
  }, [matchPhase, persistPhase, setMatchClockRunning, setMatchPhase, setReviewMode]);

  const onFullTime = useCallback(() => {
    if (matchPhase !== "second_half") return;
    setMatchClockRunning(false);
    setMatchPhase("full_time");
    setReviewMode("full_time");
    linkedMatchPeriodRef.current = MatchPeriod.FULL_TIME;
    setLinkedMatchPeriod(MatchPeriod.FULL_TIME);
    persistPhase(MatchPeriod.FULL_TIME);
  }, [matchPhase, persistPhase, setMatchClockRunning, setMatchPhase, setReviewMode]);

  useEffect(() => {
    if (canStatsPitchLog) setPitchMarkerViewFilter("all");
  }, [canStatsPitchLog]);

  const statsEventsForReviewWindow = useMemo(() => {
    if (reviewMode === "live") return statsEvents;
    if (reviewMode === "halftime") {
      return statsEvents.filter(
        (e) => e.periodPhase === "first_half" || e.periodPhase === "half_time",
      );
    }
    return statsEvents;
  }, [reviewMode, statsEvents]);

  const statsEventsForPitchView = useMemo(() => {
    if (isStatsLive || pitchMarkerViewFilter === "all") return statsEventsForReviewWindow;
    return statsEventsForReviewWindow.filter((e) => e.kind === pitchMarkerViewFilter);
  }, [statsEventsForReviewWindow, isStatsLive, pitchMarkerViewFilter]);
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
    <div
      className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden text-slate-200"
      style={{
        backgroundColor: "#0B0F12",
        backgroundImage: [
          "radial-gradient(ellipse 95% 55% at 50% -8%, rgba(90, 167, 255, 0.055), transparent 62%)",
          "radial-gradient(ellipse 70% 55% at 50% 110%, rgba(6, 8, 11, 0.75), transparent 58%)",
        ].join(", "),
      }}
    >
      {/* Subtle vignette only — no grain on shell; pitch frame keeps its own texture. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.25) 100%)",
        }}
        aria-hidden
      />
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.045] bg-white/[0.015] px-4 py-2.5 backdrop-blur-sm sm:px-7 sm:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pitchside-500 to-pitchside-700 text-[11px] font-bold leading-none text-white shadow-[0_4px_14px_-4px_rgba(5,150,105,0.55)] ring-1 ring-inset ring-white/15"
            aria-hidden
          >
            P
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.26em] text-slate-400/80">
              Pitchside
            </p>
            <h1 className="truncate text-[13px] font-semibold tracking-tight text-white/95 sm:text-sm">
              Match simulator
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={modeBubbleOpen} onOpenChange={setModeBubbleOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Change mode"
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 transition-colors",
                  "border-white/[0.07] bg-white/[0.03] text-slate-200/90 hover:border-white/[0.16] hover:bg-white/[0.06]",
                  "data-[state=open]:border-[rgba(90,167,255,0.4)] data-[state=open]:bg-[rgba(90,167,255,0.08)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12]",
                )}
              >
                <span className="text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em] text-slate-400/80">
                  Mode
                </span>
                <span className="text-[11px] font-semibold leading-none tracking-tight">
                  {surfaceMode === "STATS" ? "Stats" : "Simulator"}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400/70" strokeWidth={2} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="w-44 border-white/[0.08] bg-[rgba(14,17,22,0.96)] p-1 text-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[10px]"
            >
              <div className="flex flex-col gap-0.5">
                {(
                  [
                    { id: "SIMULATOR", label: "Simulator" },
                    { id: "STATS", label: "Stats" },
                  ] as { id: SimulatorSurfaceMode; label: string }[]
                ).map((opt) => {
                  const active = surfaceMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[11px] font-medium transition-colors",
                        active
                          ? "bg-[rgba(90,167,255,0.12)] text-[rgba(188,214,246,0.98)]"
                          : "text-slate-200/90 hover:bg-white/[0.06]",
                      )}
                      onClick={() => {
                        setMode(opt.id);
                        setModeBubbleOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                      {active ? (
                        <span
                          className="size-1.5 rounded-full bg-[rgba(90,167,255,0.85)] shadow-[0_0_6px_rgba(90,167,255,0.5)]"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={pitchBubbleOpen} onOpenChange={setPitchBubbleOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Change pitch sport"
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 transition-colors",
                  "border-white/[0.07] bg-white/[0.03] text-slate-200/90 hover:border-white/[0.16] hover:bg-white/[0.06]",
                  "data-[state=open]:border-[rgba(90,167,255,0.4)] data-[state=open]:bg-[rgba(90,167,255,0.08)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12]",
                )}
              >
                <span className="text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em] text-slate-400/80">
                  Pitch
                </span>
                <span className="text-[11px] font-semibold leading-none tracking-tight">
                  {SPORT_OPTIONS.find((o) => o.id === sport)?.label ?? "Soccer"}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400/70" strokeWidth={2} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="w-40 border-white/[0.08] bg-[rgba(14,17,22,0.96)] p-1 text-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[10px]"
            >
              <div className="flex flex-col gap-0.5">
                {SPORT_OPTIONS.map((opt) => {
                  const active = sport === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[11px] font-medium transition-colors",
                        active
                          ? "bg-[rgba(90,167,255,0.12)] text-[rgba(188,214,246,0.98)]"
                          : "text-slate-200/90 hover:bg-white/[0.06]",
                      )}
                      onClick={() => {
                        setSport(opt.id);
                        setPitchBubbleOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                      {active ? (
                        <span
                          className="size-1.5 rounded-full bg-[rgba(90,167,255,0.85)] shadow-[0_0_6px_rgba(90,167,255,0.5)]"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          {surfaceMode === "STATS" ? (
            <Popover open={reviewBubbleOpen} onOpenChange={setReviewBubbleOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Open review tools"
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 transition-colors",
                    "border-white/[0.07] bg-white/[0.03] text-slate-200/90 hover:border-white/[0.16] hover:bg-white/[0.06]",
                    "data-[state=open]:border-[rgba(90,167,255,0.4)] data-[state=open]:bg-[rgba(90,167,255,0.08)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12]",
                  )}
                >
                  <span className="text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em] text-slate-400/80">
                    Review
                  </span>
                  <span className="text-[11px] font-semibold leading-none tracking-tight">
                    {reviewMode === "live" ? "Live" : reviewMode === "halftime" ? "HT" : "FT"}
                  </span>
                  {canStatsPitchLog ? (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                      aria-hidden
                      title="Logging live"
                    />
                  ) : null}
                  <ChevronDown className="h-3 w-3 text-slate-400/70" strokeWidth={2} />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="w-[320px] max-w-[92vw] overflow-hidden border-white/[0.08] bg-[rgba(14,17,22,0.96)] p-0 text-slate-100 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[10px]"
              >
                <div className="relative flex max-h-[78vh] flex-col">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(148,185,230,0.22) 50%, transparent 100%)",
                    }}
                    aria-hidden
                  />
                  <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-[rgba(90,167,255,0.55)] to-[rgba(90,167,255,0.12)]"
                        aria-hidden
                      />
                      <span
                        className="text-[9.5px] font-semibold uppercase leading-none tracking-[0.26em] text-[rgba(228,232,240,0.82)]"
                        style={{ fontFeatureSettings: "\"ss01\" 1" }}
                      >
                        Review tools
                      </span>
                    </div>
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-200/85">
                      {matchPhase.replace(/_/g, " ")} · {matchClockRunning ? "running" : "stopped"}
                    </span>
                  </header>
                  <div
                    className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
                    role="group"
                    aria-label="Stats review tools"
                  >
                    <div>
                      <p className="mb-1.5 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[rgba(228,232,240,0.55)]">
                        Review
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {STATS_REVIEW_CHIPS.map(({ mode, label }) => (
                          <button
                            key={mode}
                            type="button"
                            className={reviewChipClass(reviewMode === mode)}
                            onClick={() => {
                              setReviewMode(mode);
                              setReviewBubbleOpen(false);
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {statsPersistError ? (
                      <p
                        role="status"
                        className="rounded-[8px] border border-red-400/28 bg-red-950/35 px-2 py-1.5 text-[9px] font-medium leading-snug text-red-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                      >
                        Save failed: {statsPersistError}
                      </p>
                    ) : null}
                    {!isStatsLive ? (
                      <div>
                        <p className="mb-1.5 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[rgba(228,232,240,0.55)]">
                          Pitch marker filter
                        </p>
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
                              onClick={() => {
                                setPitchMarkerViewFilter(id);
                                setReviewBubbleOpen(false);
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[rgba(228,232,240,0.55)]">
                          Players
                        </p>
                        <span className="text-[8.5px] font-medium uppercase tracking-[0.16em] text-slate-400/65">
                          {statsPlayers.length}/15
                        </span>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {statsPlayers.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1 pl-1 pr-2.5 text-[9px] font-semibold text-slate-100/90"
                            title={p.name}
                          >
                            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[rgba(90,167,255,0.18)] px-1 text-[8px] font-bold tabular-nums text-[rgba(180,210,245,0.96)]">
                              {p.number}
                            </span>
                            <span className="truncate">{p.name}</span>
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        <input
                          type="text"
                          value={playerNameDraft}
                          onChange={(e) => setPlayerNameDraft(e.target.value)}
                          placeholder="Player name"
                          className="h-8 rounded-[8px] border border-white/[0.08] bg-black/30 px-2.5 text-[10px] text-slate-100 transition-colors placeholder:text-slate-400/50 focus:border-[rgba(90,167,255,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(90,167,255,0.2)] focus:ring-offset-0"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={playerNumberDraft}
                            onChange={(e) => setPlayerNumberDraft(e.target.value)}
                            placeholder="#"
                            className="h-8 w-14 rounded-[8px] border border-white/[0.08] bg-black/30 px-2.5 text-center font-mono text-[10px] tabular-nums text-slate-100 transition-colors placeholder:text-slate-400/50 focus:border-[rgba(90,167,255,0.4)] focus:outline-none focus:ring-2 focus:ring-[rgba(90,167,255,0.2)] focus:ring-offset-0"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className={cn("min-h-8 flex-1 py-1.5 text-[9px]", btnBase, btnIdle)}
                            disabled={statsPlayers.length >= 15}
                            onClick={() => {
                              onAddStatsPlayer();
                              setReviewBubbleOpen(false);
                            }}
                          >
                            Add player
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[rgba(228,232,240,0.55)]">
                        Log actions
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!canStatsPitchLog}
                          className={cn("min-h-8 flex-1 py-1.5 text-[9px]", btnBase, btnIdle)}
                          onClick={() => {
                            clearArm();
                            setReviewBubbleOpen(false);
                          }}
                        >
                          Clear arm
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!canStatsPitchLog || statsEvents.length === 0}
                          className={cn("min-h-8 flex-1 py-1.5 text-[9px]", btnBase, btnIdle)}
                          onClick={() => {
                            undoLastEvent();
                            setReviewBubbleOpen(false);
                          }}
                        >
                          Undo last
                        </Button>
                        {clearLogConfirmOpen ? (
                          <div className="w-full rounded-[10px] border border-amber-400/22 bg-amber-950/30 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                            <p className="mb-1.5 text-[10px] font-medium text-amber-100/92">
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
                                onClick={() => {
                                  setClearLogConfirmOpen(false);
                                  setReviewBubbleOpen(false);
                                }}
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
                                  setReviewBubbleOpen(false);
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
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2">
                      <p className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-black/25 px-2.5 py-0.5 text-[9px] font-medium tabular-nums tracking-[0.04em] text-[rgba(228,232,240,0.65)]">
                        <span className="size-1 rounded-full bg-[rgba(90,167,255,0.5)] shadow-[0_0_4px_rgba(90,167,255,0.4)]" aria-hidden />
                        Logged: {statsEventsForReviewWindow.length}
                      </p>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-5 lg:flex-row lg:items-center lg:justify-center lg:gap-5 lg:px-6 lg:py-4 xl:gap-6 xl:px-8">
        <aside className="order-2 flex shrink-0 flex-row gap-3.5 lg:order-1 lg:w-[12rem] lg:flex-col lg:justify-center lg:gap-4">
          <ToolRail title="Transport" className="min-w-0 flex-1 lg:flex-none">
            {surfaceMode === "SIMULATOR" ? (
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
            ) : (
              <div className="flex flex-col gap-1.5" role="group" aria-label="Stats match clock">
                {matchPhase === "pre_match" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn("min-h-8 py-1.5 text-[10px]", btnBase, btnSportOn)}
                    onClick={onStartMatch}
                  >
                    Start Match
                  </Button>
                ) : null}
                {(matchPhase === "first_half" || matchPhase === "second_half") &&
                matchClockRunning ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn("min-h-8 py-1.5 text-[10px]", btnBase, btnIdle)}
                    onClick={onStopMatchClock}
                  >
                    Stop
                  </Button>
                ) : null}
                {(matchPhase === "first_half" || matchPhase === "second_half") &&
                !matchClockRunning ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn("min-h-8 py-1.5 text-[10px]", btnBase, btnSportOn)}
                    onClick={onResumeMatchClock}
                  >
                    Resume
                  </Button>
                ) : null}
                {matchPhase === "first_half" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn("min-h-8 py-1.5 text-[10px]", btnBase, btnRecordOn)}
                    onClick={onHalfTime}
                  >
                    Half Time
                  </Button>
                ) : null}
                {matchPhase === "halftime" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn("min-h-8 py-1.5 text-[10px]", btnBase, btnSportOn)}
                    onClick={onStartSecondHalf}
                  >
                    Resume 2nd Half
                  </Button>
                ) : null}
                {matchPhase === "second_half" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn("min-h-8 py-1.5 text-[10px]", btnBase, btnRecordOn)}
                    onClick={onFullTime}
                  >
                    Full Time
                  </Button>
                ) : null}
                <p className="mt-1 rounded-[8px] border border-white/[0.06] bg-black/25 px-2 py-1 text-center font-mono text-[9px] font-semibold tabular-nums tracking-[0.08em] text-emerald-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  {matchClockDisplay}
                </p>
              </div>
            )}
          </ToolRail>
        </aside>

        <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center lg:order-2 lg:max-w-[min(96vw,74rem)]">
          <div className="relative w-full max-w-full px-1 sm:px-2">
            {/* Soft lift behind pitch — no hard frame ring */}
            <div
              className="pointer-events-none absolute -inset-4 rounded-[1.75rem] bg-[radial-gradient(ellipse_at_50%_42%,rgba(62,70,48,0.14),transparent_68%)] blur-xl"
              aria-hidden
            />
            <div
              className="relative overflow-hidden rounded-[1.2rem] p-2 sm:p-2.5"
              style={{
                backgroundColor: GRASS.fresh,
                backgroundImage: [
                  `linear-gradient(188deg, rgba(175,167,133,0.16) 0%, transparent 48%, rgba(143,155,106,0.1) 100%)`,
                  `linear-gradient(88deg, ${GRASS.worn} 0%, transparent 32%, rgba(255,255,255,0.025) 54%, transparent 78%, ${GRASS.dry} 100%)`,
                ].join(", "),
                boxShadow:
                  "0 28px 64px -24px rgba(22, 26, 16, 0.22), 0 12px 32px -18px rgba(22, 26, 16, 0.12)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.022] mix-blend-multiply"
                style={{
                  backgroundImage: grassNoiseDataUrl,
                  backgroundSize: "180px 180px",
                }}
                aria-hidden
              />
              {/*
                Stadium apron: muted clay band, faint lane curves, chalk at pitch — Pixi untouched.
              */}
              <div
                className="relative z-10 overflow-hidden rounded-[1.05rem] p-1 sm:p-1.5"
                style={{
                  backgroundColor: "transparent",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.18)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.038] mix-blend-multiply [filter:blur(0.65px)]"
                  style={{
                    backgroundImage: clayNoiseDataUrl,
                    backgroundSize: "220px 220px",
                  }}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.32]"
                  style={{
                    backgroundImage: laneCurvesDataUrl,
                    backgroundSize: "cover",
                    backgroundPosition: "50% 52%",
                  }}
                  aria-hidden
                />
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
                      surfaceMode === "STATS" ? onStatsPitchTapGuarded : undefined
                    }
                    statsReviewMode={reviewMode}
                    statsPitchInteractive={canStatsPitchLog}
                    className="max-h-[min(68dvh,calc(100dvw-2.5rem))] w-full !rounded-lg !border-0 !bg-transparent !shadow-none !ring-0 sm:max-h-[min(72dvh,80vw)] lg:max-h-[min(78dvh,58rem)]"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md px-3 text-center text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-slate-400/65 sm:mt-5 sm:text-[11px] sm:tracking-[0.16em]">
            {surfaceMode === "STATS"
              ? canStatsPitchLog
                ? "Pick event type · tap the pitch to log · same Pixi canvas as simulator"
                : "Review or pause · use match control to start / resume play · filters refine pitch dots"
              : "Select a player · draw on the pitch · transport on the left"}
          </p>
        </div>

        <aside className="order-3 flex shrink-0 flex-row flex-wrap gap-3.5 lg:w-[12rem] lg:flex-col lg:justify-center lg:gap-4">
          {surfaceMode === "STATS" ? (
            <>
              <ToolRail title="Scorer" className="min-w-0 flex-1 lg:flex-none">
                <StatsScorerStrip
                  players={statsPlayers}
                  pendingLabel={pendingScoreLabel}
                  activeScorerId={activeScorerId}
                  onSetActiveScorer={setActiveScorer}
                />
              </ToolRail>
              <ToolRail title="Voice" className="min-w-0 flex-1 lg:flex-none">
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
              </ToolRail>
            </>
          ) : (
            <ToolRail title="Capture" className="min-w-0 flex-1 lg:flex-none">
              <div className="flex flex-col gap-2" role="group" aria-label="Path capture">
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(btnBase, pathRecording ? btnRecordOn : btnIdle)}
                  aria-pressed={pathRecording}
                  onClick={() => setMainRecording(!pathRecording)}
                >
                  {pathRecording ? "Recording path…" : "Record path"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
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
                  <p
                    role="status"
                    className="rounded-[8px] border border-amber-400/22 bg-amber-950/30 px-2 py-1.5 text-[9px] font-medium leading-snug text-amber-100/95"
                  >
                    {pitchExportError}
                  </p>
                ) : null}
              </div>
            </ToolRail>
          )}
        </aside>
      </main>
      {surfaceMode === "STATS" ? (
        <footer
          className={cn(
            "relative z-10 shrink-0 border-t border-white/[0.06] px-3 py-2 backdrop-blur-[6px] sm:px-4 lg:px-6 lg:py-2.5",
          )}
          style={{
            backgroundColor: "rgba(14,17,22,0.72)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.03), 0 -6px 22px -12px rgba(0,0,0,0.55)",
          }}
          aria-label="Stats event logging bar"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(148,185,230,0.18) 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div
            className={cn(
              "flex items-center gap-2.5 overflow-x-auto",
              !canStatsPitchLog && "pointer-events-none opacity-45",
            )}
          >
            <span
              className="flex shrink-0 items-center gap-1.5 pr-1 text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em] text-[rgba(228,232,240,0.55)]"
              aria-hidden
            >
              <span
                className="size-1 rounded-full bg-emerald-400/75 shadow-[0_0_4px_rgba(52,211,153,0.55)]"
                aria-hidden
              />
              Score
            </span>
            <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label="Score kinds">
              {STATS_V1_SCORE_KINDS.map((k) => {
                const on = statsArm === k;
                return (
                  <Button
                    key={`bar-score-${k}`}
                    type="button"
                    variant="secondary"
                    aria-pressed={on}
                    onClick={() => armKind(k)}
                    className={cn(
                      btnBase,
                      "min-h-9 w-auto whitespace-nowrap px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                      on ? btnSportOn : btnIdle,
                    )}
                  >
                    {kindUiLabel(k)}
                  </Button>
                );
              })}
            </div>
            <div className="h-5 w-px shrink-0 bg-white/[0.08]" aria-hidden />
            <span
              className="flex shrink-0 items-center gap-1.5 pr-1 text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em] text-[rgba(228,232,240,0.55)]"
              aria-hidden
            >
              <span
                className="size-1 rounded-full bg-[rgba(90,167,255,0.55)] shadow-[0_0_4px_rgba(90,167,255,0.5)]"
                aria-hidden
              />
              Field
            </span>
            <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label="Field kinds">
              {STATS_V1_FIELD_KINDS.map((k) => {
                const on = statsArm === k;
                return (
                  <Button
                    key={`bar-field-${k}`}
                    type="button"
                    variant="secondary"
                    aria-pressed={on}
                    onClick={() => armKind(k)}
                    className={cn(
                      btnBase,
                      "min-h-9 w-auto whitespace-nowrap px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                      on ? btnRecordOn : btnIdle,
                    )}
                  >
                    {kindUiLabel(k)}
                  </Button>
                );
              })}
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
