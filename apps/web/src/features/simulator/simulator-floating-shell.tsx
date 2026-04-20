// <!-- redeploy trigger -->
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PitchSport } from "@/config/pitchConfig";
import {
  downloadPitchCanvasPng,
  shareOrDownloadPitchPng,
} from "@/lib/pitch-canvas-export";
import { persistSimulatorPhaseChange } from "@/lib/persist-simulator-phase-change";
import { persistSimulatorStatsEvent } from "@/lib/persist-simulator-stats-event";
import { MobileControlsOverlay } from "@src/features/simulator/mobile-controls-overlay";
import {
  SimulatorPixiSurface,
  type SimulatorPixiSurfaceHandle,
  type SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
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

type PitchMarkerViewFilter = "all" | StatsV1EventKind;

type LinkedMatchPeriod = "FIRST_HALF" | "HALF_TIME" | "SECOND_HALF" | "FULL_TIME";

const MATCH_PERIOD: Record<LinkedMatchPeriod, LinkedMatchPeriod> = {
  FIRST_HALF: "FIRST_HALF",
  HALF_TIME: "HALF_TIME",
  SECOND_HALF: "SECOND_HALF",
  FULL_TIME: "FULL_TIME",
};

function kindUiLabel(kind: string): string {
  return kind.replace(/_/g, " ").toLowerCase();
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

      <MobileControlsOverlay />
    </div>
  );
}
