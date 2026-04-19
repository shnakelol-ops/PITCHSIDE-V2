"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { CirclePlus, Mic, SlidersHorizontal } from "lucide-react";

import { normalizeMatchPeriod } from "@/components/match/MatchMode";
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
const MOBILE_STATS_REVIEW_CHIPS: { mode: StatsReviewMode; label: string }[] = [
  { mode: "live", label: "Live" },
  { mode: "halftime", label: "HT" },
  { mode: "full_time", label: "FT" },
];
const MOBILE_PRIMARY_EVENT_KINDS: readonly StatsV1EventKind[] = [
  "GOAL",
  "POINT",
  "TWO_POINT",
  "WIDE",
  "SHOT",
  "TURNOVER_WON",
  "TURNOVER_LOST",
  "FREE_WON",
  "FREE_CONCEDED",
  "KICKOUT_WON",
  "KICKOUT_LOST",
];
const MOBILE_LOG_BUBBLE_STORAGE_KEY = "pitchside.mobileStats.logEventBubbleY";
const MOBILE_LOG_BUBBLE_FIXED_RIGHT = 14;
const MOBILE_LOG_BUBBLE_MIN_TOP = 88;
const MOBILE_LOG_BUBBLE_BOTTOM_SAFE_OFFSET = 160;
const MOBILE_LOG_BUBBLE_DEFAULT_TOP_VH = 42;

type MobileLogBubbleDragState = {
  pointerId: number;
  startY: number;
  originY: number;
  dragging: boolean;
};
const MOBILE_LOG_BUBBLE_DRAG_THRESHOLD = 6;

function readMobileLogBubbleY(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MOBILE_LOG_BUBBLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

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

/** Muted terracotta / clay (no athletics orange). */
const CLAY = {
  deep: "#6e5a52",
  mid: "#7d6860",
  light: "#8c756c",
};

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
  bg: "rgba(18, 20, 24, 0.58)",
  border: "rgba(255, 252, 248, 0.085)",
  title: "rgba(228, 226, 220, 0.72)",
  shadow:
    "0 4px 24px -4px rgba(0, 0, 0, 0.35), 0 12px 40px -16px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
};

/** Thin stadium apron: clay band + lane whispers — Pixi / layout unchanged. */
const stadiumApronStyle: CSSProperties = {
  backgroundColor: CLAY.mid,
  backgroundImage: [
    `linear-gradient(180deg, rgba(159,175,122,0.26) 0%, transparent 11%, transparent 89%, rgba(132,142,108,0.18) 100%)`,
    `linear-gradient(168deg, ${CLAY.light} 0%, ${CLAY.mid} 44%, ${CLAY.deep} 100%)`,
    `radial-gradient(ellipse 98% 72% at 50% 32%, rgba(255,252,248,0.07), transparent 55%)`,
    `radial-gradient(ellipse 92% 58% at 50% 118%, rgba(42, 34, 30, 0.1), transparent 50%)`,
  ].join(", "),
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(38, 30, 26, 0.07)",
};

/** Uneven field: soft diagonals + gentle vertical drift + light radials (no flat panel fill). */
const grassFieldStyle: CSSProperties = {
  backgroundColor: GRASS.fresh,
  backgroundImage: [
    `linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 38%, rgba(55, 62, 40, 0.035) 100%)`,
    `linear-gradient(101deg, ${GRASS.worn} 0%, transparent 26%, ${GRASS.dry} 50%, transparent 70%, ${GRASS.worn} 94%)`,
    `radial-gradient(ellipse 95% 60% at 72% 18%, rgba(175,167,133,0.22), transparent 54%)`,
    `radial-gradient(ellipse 80% 50% at 12% 85%, rgba(100, 108, 72, 0.1), transparent 56%)`,
  ].join(", "),
};

/**
 * Mobile STATS-only stadium ambience (visual-only):
 * subtle crowd-bowl toning + floodlight bloom around outer field space.
 * Sits behind pitch/controls and does not participate in layout.
 */
const mobileStatsStadiumBackdropStyle: CSSProperties = {
  backgroundImage: [
    "radial-gradient(ellipse 132% 74% at 50% 112%, rgba(18,29,54,0.22) 0%, rgba(18,29,54,0.14) 45%, transparent 72%)",
    "radial-gradient(ellipse 98% 66% at 50% -14%, rgba(245,248,255,0.19) 0%, rgba(188,208,255,0.06) 38%, transparent 72%)",
    "linear-gradient(90deg, rgba(28,40,69,0.29) 0%, rgba(23,35,58,0.11) 15%, transparent 32%, transparent 68%, rgba(23,35,58,0.11) 85%, rgba(28,40,69,0.29) 100%)",
    "linear-gradient(180deg, rgba(240,246,255,0.09) 0%, rgba(176,196,236,0.03) 12%, transparent 42%, rgba(16,25,44,0.14) 100%)",
    "radial-gradient(ellipse 94% 64% at 50% 52%, rgba(8,14,28,0) 40%, rgba(10,17,33,0.16) 72%, rgba(7,12,24,0.28) 100%)",
  ].join(", "),
};

const mobileStatsStadiumFloodlightStyle: CSSProperties = {
  backgroundImage: [
    "radial-gradient(circle at 8% 6%, rgba(255,255,255,0.16) 0%, rgba(242,248,255,0.09) 18%, transparent 45%)",
    "radial-gradient(circle at 92% 6%, rgba(255,255,255,0.16) 0%, rgba(242,248,255,0.09) 18%, transparent 45%)",
    "radial-gradient(ellipse 82% 56% at 50% 100%, rgba(32,52,90,0.13) 0%, transparent 72%)",
  ].join(", "),
};

const mobileStatsStadiumEdgeFadeStyle: CSSProperties = {
  backgroundImage:
    "radial-gradient(ellipse 88% 60% at 50% 54%, transparent 0%, transparent 56%, rgba(15,22,38,0.14) 74%, rgba(10,16,28,0.26) 100%)",
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
const mobileActionBtnClass =
  "min-h-9 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px] text-stone-100 hover:border-white/25 hover:bg-[rgba(56,66,92,0.82)]";

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

function formatMatchPhaseLabel(phase: string): string {
  return phase.replace(/_/g, " ");
}

function formatMobileEventLabel(kind: StatsV1EventKind): string {
  return kind.replace(/_/g, " ");
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
  const [mobileStatsDrawerOpen, setMobileStatsDrawerOpen] = useState(false);
  const [mobileStatsLogDrawerOpen, setMobileStatsLogDrawerOpen] = useState(false);
  const [mobileLogBubbleY, setMobileLogBubbleY] = useState<number | null>(null);
  const [mobileLogBubbleYHydrated, setMobileLogBubbleYHydrated] = useState(false);
  const mobileLogBubbleDragRef = useRef<MobileLogBubbleDragState | null>(null);
  const mobileLogBubbleLastPointerDownRef = useRef(0);
  const mobileLogBubbleJustDraggedRef = useRef(false);
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

  useEffect(() => {
    if (surfaceMode !== "STATS") {
      setMobileStatsDrawerOpen(false);
      setMobileStatsLogDrawerOpen(false);
    }
  }, [surfaceMode]);

  const clampMobileLogBubbleY = useCallback(
    (y: number) => {
      if (typeof window === "undefined") return y;
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const minTop = MOBILE_LOG_BUBBLE_MIN_TOP + viewportTop;
      const maxTop = Math.max(
        minTop,
        viewportTop + viewportHeight - MOBILE_LOG_BUBBLE_BOTTOM_SAFE_OFFSET,
      );
      return Math.min(Math.max(y, minTop), maxTop);
    },
    [],
  );

  const computeDefaultMobileLogBubbleY = useCallback(() => {
    if (typeof window === "undefined") return MOBILE_LOG_BUBBLE_MIN_TOP;
    const viewportTop = window.visualViewport?.offsetTop ?? 0;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    return clampMobileLogBubbleY(
      viewportTop + (viewportHeight * MOBILE_LOG_BUBBLE_DEFAULT_TOP_VH) / 100,
    );
  }, [clampMobileLogBubbleY]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedY = readMobileLogBubbleY();
    if (savedY != null) {
      setMobileLogBubbleY(clampMobileLogBubbleY(savedY));
    } else {
      setMobileLogBubbleY(computeDefaultMobileLogBubbleY());
    }
    setMobileLogBubbleYHydrated(true);
  }, [clampMobileLogBubbleY, computeDefaultMobileLogBubbleY]);

  useEffect(() => {
    if (!mobileLogBubbleYHydrated || mobileLogBubbleY == null) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MOBILE_LOG_BUBBLE_STORAGE_KEY, `${mobileLogBubbleY}`);
  }, [mobileLogBubbleY, mobileLogBubbleYHydrated]);

  useEffect(() => {
    if (!mobileLogBubbleYHydrated) return;
    if (typeof window === "undefined") return;
    const onResize = () => {
      setMobileLogBubbleY((prev) =>
        clampMobileLogBubbleY(prev ?? computeDefaultMobileLogBubbleY()),
      );
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [
    clampMobileLogBubbleY,
    computeDefaultMobileLogBubbleY,
    mobileLogBubbleYHydrated,
  ]);

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
  const activeScorerPlayer = useMemo(
    () => statsPlayers.find((p) => p.id === activeScorerId) ?? null,
    [activeScorerId, statsPlayers],
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

  const onToggleMobileVoice = useCallback(() => {
    if (recorder.isRecording) {
      void onStopVoice();
      return;
    }
    void onStartVoice();
  }, [onStartVoice, onStopVoice, recorder.isRecording]);

  const onLogMobileEventKind = useCallback(
    (kind: StatsV1EventKind) => {
      if (!canStatsPitchLog) return;
      armKind(kind);
      logTap({ nx: 0.5, ny: 0.5, atMs: Date.now(), stageX: 0, stageY: 0 });
    },
    [armKind, canStatsPitchLog, logTap],
  );

  const onMobileLogBubblePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      const now = Date.now();
      if (now - mobileLogBubbleLastPointerDownRef.current < 250) return;
      mobileLogBubbleLastPointerDownRef.current = now;
      const currentY = mobileLogBubbleY ?? computeDefaultMobileLogBubbleY();
      mobileLogBubbleDragRef.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        originY: currentY,
        dragging: false,
      };
      mobileLogBubbleJustDraggedRef.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [computeDefaultMobileLogBubbleY, mobileLogBubbleY],
  );

  const onMobileLogBubblePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = mobileLogBubbleDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const dy = e.clientY - drag.startY;
      if (!drag.dragging && Math.abs(dy) > MOBILE_LOG_BUBBLE_DRAG_THRESHOLD) {
        drag.dragging = true;
      }
      if (!drag.dragging) return;
      setMobileLogBubbleY(clampMobileLogBubbleY(drag.originY + dy));
      e.preventDefault();
    },
    [clampMobileLogBubbleY],
  );

  const onMobileLogBubblePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = mobileLogBubbleDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const wasDragging = drag.dragging;
      mobileLogBubbleJustDraggedRef.current = wasDragging;
      mobileLogBubbleDragRef.current = null;
      if (wasDragging) {
        e.preventDefault();
      }
    },
    [],
  );

  const onMobileLogBubblePointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = mobileLogBubbleDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      mobileLogBubbleDragRef.current = null;
    },
    [],
  );

  const onMobileLogBubbleClickCapture = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!mobileLogBubbleJustDraggedRef.current) return;
      mobileLogBubbleJustDraggedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  return (
    <div
      className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden text-stone-800"
      style={grassFieldStyle}
    >
      {/* Minimal grain only (~2.8%) — enough to kill “flat UI”, not noisy. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.028] mix-blend-multiply"
        style={{
          backgroundImage: grassNoiseDataUrl,
          backgroundSize: "240px 240px",
        }}
        aria-hidden
      />

      {surfaceMode === "STATS" ? (
        <div
          className="fixed inset-0 z-40 h-[100dvh] w-screen overflow-hidden md:hidden"
          style={grassFieldStyle}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.028] mix-blend-multiply"
            style={{
              backgroundImage: grassNoiseDataUrl,
              backgroundSize: "240px 240px",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] blur-[3px]"
            style={mobileStatsStadiumBackdropStyle}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[2] opacity-70 blur-[2px]"
            style={mobileStatsStadiumFloodlightStyle}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[3]"
            style={mobileStatsStadiumEdgeFadeStyle}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 z-10 flex min-h-0 flex-col overflow-hidden">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <SimulatorPixiSurface
                ref={surfaceRef}
                sport={sport}
                recordingMode={false}
                shadowRecordingMode={false}
                surfaceMode={surfaceMode}
                statsArm={statsArm}
                statsLoggedEvents={statsEventsForPitchView}
                onStatsPitchTap={onStatsPitchTapGuarded}
                statsReviewMode={reviewMode}
                statsPitchInteractive={canStatsPitchLog}
                fullBleed
                className="h-full w-full !mx-0 !max-w-none !rounded-none !border-0 !bg-transparent !shadow-none !ring-0"
              />
            </div>

            <aside
              className="pointer-events-none absolute left-[max(0.45rem,env(safe-area-inset-left))] top-[calc(max(0.55rem,env(safe-area-inset-top))+6.25rem)] z-30 flex flex-col gap-2.5"
              aria-label="Mobile match utility"
            >
              <Button
                type="button"
                variant="secondary"
                className="pointer-events-auto min-h-9 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2.5 py-1 text-[9px] font-semibold text-stone-100"
                aria-pressed={reviewMode === "live"}
                onClick={() => setReviewMode("live")}
              >
                {matchClockDisplay}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(
                  "pointer-events-auto min-h-9 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[9px] font-semibold",
                  recorder.isRecording &&
                    "border-rose-300/60 bg-[rgba(120,42,54,0.82)] text-rose-50",
                )}
                onClick={onToggleMobileVoice}
              >
                <Mic className="mr-1 size-3.5" />
                {recorder.isRecording ? "Stop" : "Voice"}
              </Button>
            </aside>

            <aside className="pointer-events-none absolute right-[max(0.55rem,env(safe-area-inset-right))] top-[max(0.55rem,env(safe-area-inset-top))] z-30">
              <Drawer open={mobileStatsDrawerOpen} onOpenChange={setMobileStatsDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="pointer-events-auto min-h-10 rounded-full border border-white/20 bg-[rgba(32,44,69,0.92)] px-3 py-2 text-[11px] font-semibold text-stone-100 shadow-[0_12px_28px_-20px_rgba(0,0,0,0.9)]"
                    aria-label="Open stats controls"
                  >
                    <SlidersHorizontal className="size-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="md:hidden">
                  <DrawerHeader>
                    <DrawerTitle>Stats controls</DrawerTitle>
                    <DrawerDescription>
                      Secondary controls for scorer, review, and voice.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="max-h-[calc(82dvh-4.25rem)] space-y-2.5 overflow-y-auto px-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Mode / review</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-1.5">
                          {MOBILE_STATS_REVIEW_CHIPS.map(({ mode, label }) => (
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
                  </div>
                </DrawerContent>
              </Drawer>
            </aside>

            <div className="pointer-events-none absolute inset-0 z-30">
              <Drawer
                open={mobileStatsLogDrawerOpen}
                onOpenChange={setMobileStatsLogDrawerOpen}
              >
                <DrawerTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    style={{
                      right: `max(${MOBILE_LOG_BUBBLE_FIXED_RIGHT}px, calc(env(safe-area-inset-right) + 0.4rem))`,
                      top: `${mobileLogBubbleY ?? computeDefaultMobileLogBubbleY()}px`,
                      touchAction: "none",
                    }}
                    className="pointer-events-auto absolute flex h-[52px] items-center gap-2 rounded-full border border-white/20 bg-[rgba(18,28,46,0.84)] px-3.5 text-[11px] font-semibold text-stone-100 shadow-[0_10px_26px_-14px_rgba(0,0,0,0.85)] backdrop-blur-[10px]"
                    aria-label="Open quick event logger"
                    onPointerDown={onMobileLogBubblePointerDown}
                    onPointerMove={onMobileLogBubblePointerMove}
                    onPointerUp={onMobileLogBubblePointerUp}
                    onPointerCancel={onMobileLogBubblePointerCancel}
                    onClickCapture={onMobileLogBubbleClickCapture}
                  >
                    <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/15 bg-white/10">
                      <CirclePlus className="size-3.5" />
                    </span>
                    Log Event
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="md:hidden">
                  <DrawerHeader>
                    <DrawerTitle>Quick events</DrawerTitle>
                    <DrawerDescription>
                      Tap an event to log immediately.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="max-h-[calc(72dvh-3.5rem)] overflow-y-auto px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      {MOBILE_PRIMARY_EVENT_KINDS.map((kind) => (
                        <Button
                          key={kind}
                          type="button"
                          variant="secondary"
                          className={cn(
                            "min-h-11 rounded-lg border px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.03em]",
                            statsArm === kind
                              ? "border-emerald-300/65 bg-emerald-700/45 text-emerald-50"
                              : "border-white/20 bg-[rgba(34,38,48,0.84)] text-stone-100",
                          )}
                          disabled={!canStatsPitchLog}
                          onClick={() => onLogMobileEventKind(kind)}
                        >
                          {formatMobileEventLabel(kind)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      ) : null}

      <header
        className={cn(
          "relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 py-4 sm:px-7 sm:py-5 md:flex",
          surfaceMode === "STATS" && "hidden md:flex",
        )}
      >
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-stone-800/65">
            Pitchside
          </p>
          <h1 className="truncate text-base font-semibold tracking-tight text-stone-900/95 sm:text-[17px]">
            Match simulator
          </h1>
          <p className="hidden text-[11px] text-stone-800/60 sm:block">
            Field view — training strip in natural grass.
          </p>
        </div>
      </header>

      <main
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 md:flex lg:flex-row lg:items-center lg:justify-center lg:gap-8 lg:px-10 lg:py-6 xl:gap-12 xl:px-14",
          surfaceMode === "STATS" && "hidden gap-0 p-0 sm:gap-0 sm:p-0 md:flex md:gap-5 md:p-6",
        )}
      >
        <aside
          className={cn(
            "order-2 flex shrink-0 flex-row gap-3.5 lg:order-1 lg:w-[11.5rem] lg:flex-col lg:justify-center lg:gap-4",
            surfaceMode === "STATS" && "hidden md:flex",
          )}
        >
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
                <p className="text-[8px] font-semibold tabular-nums text-emerald-100/85">
                  {matchClockDisplay}
                </p>
              </div>
            )}
          </ToolRail>
        </aside>

        <div
          className={cn(
            "order-1 flex min-h-0 min-w-0 flex-1 flex-col lg:order-2 lg:max-w-[min(96vw,74rem)]",
            surfaceMode === "STATS"
              ? "items-stretch justify-start md:items-center md:justify-center"
              : "items-center justify-center",
          )}
        >
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
                  ...stadiumApronStyle,
                  backgroundColor: "#ff0000",
                  backgroundImage: "none",
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
          <p className="mx-auto mt-4 max-w-md px-3 text-center text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-stone-800/55 sm:mt-5 sm:text-[11px] sm:tracking-[0.16em]">
            {surfaceMode === "STATS"
              ? canStatsPitchLog
                ? "Pick event type · tap the pitch to log · same Pixi canvas as simulator"
                : "Review or pause · use match control to start / resume play · filters refine pitch dots"
              : "Select a player · draw on the pitch · transport on the left"}
          </p>
        </div>

        <aside
          className={cn(
            "order-3 flex shrink-0 flex-row flex-wrap gap-3.5 lg:w-[11.5rem] lg:flex-col lg:justify-center lg:gap-4",
            surfaceMode === "STATS" && "hidden md:flex",
          )}
        >
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
          </ToolRail>
          {surfaceMode === "STATS" ? (
            <ToolRail title="Stats V1" className="min-w-0 flex-1 basis-[48%] lg:basis-auto lg:flex-none">
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
                <div className="rounded-md border border-white/[0.08] bg-black/10 px-2 py-2">
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-[rgba(228,226,220,0.55)]">
                    Match state
                  </p>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-emerald-100/90">
                    {matchPhase.replace(/_/g, " ")} · {matchClockRunning ? "running" : "stopped"}
                  </p>
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
                </div>
                <StatsScorerStrip
                  players={statsPlayers}
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
                <p className="text-[9px] tabular-nums text-[rgba(228,226,220,0.5)]">
                  Logged: {statsEventsForReviewWindow.length}
                </p>
              </div>
            </ToolRail>
          ) : null}
          {surfaceMode === "STATS" ? (
            <ToolRail
              title="Players"
              className="min-w-0 flex-1 basis-[48%] lg:basis-auto lg:flex-none"
            >
              <div className="flex flex-col gap-2">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {statsPlayers.map((p) => (
                    <span
                      key={p.id}
                      className="shrink-0 rounded border border-white/20 bg-white/5 px-2 py-1 text-[9px] font-semibold text-emerald-100/90"
                      title={p.name}
                    >
                      #{p.number} {p.name}
                    </span>
                  ))}
                </div>
                <p className="text-[8px] text-emerald-100/60">
                  Slide to browse players ({statsPlayers.length}/15)
                </p>
                <input
                  type="text"
                  value={playerNameDraft}
                  onChange={(e) => setPlayerNameDraft(e.target.value)}
                  placeholder="Player name"
                  className="h-8 rounded border border-white/15 bg-black/20 px-2 text-[10px] text-emerald-50 placeholder:text-emerald-200/40"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={playerNumberDraft}
                    onChange={(e) => setPlayerNumberDraft(e.target.value)}
                    placeholder="#"
                    className="h-8 w-14 rounded border border-white/15 bg-black/20 px-2 text-[10px] text-emerald-50 placeholder:text-emerald-200/40"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn("min-h-8 flex-1 py-1.5 text-[9px]", btnBase, btnIdle)}
                    disabled={statsPlayers.length >= 15}
                    onClick={onAddStatsPlayer}
                  >
                    Add player
                  </Button>
                </div>
              </div>
            </ToolRail>
          ) : null}
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
