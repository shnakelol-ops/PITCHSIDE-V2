// <!-- redeploy trigger -->
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { persistSimulatorStatsEvent } from "@/lib/persist-simulator-stats-event";
import { MobileControlsOverlay } from "@src/features/simulator/mobile-controls-overlay";
import {
  SimulatorPixiSurface,
  type SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
import { useSimulatorMatchClock } from "@src/features/stats/hooks/use-simulator-match-clock";
import { useStatsEventLog } from "@src/features/stats/hooks/use-stats-event-log";
import type {
  StatsLoggedEvent,
  StatsPeriodPhase,
} from "@src/features/stats/model/stats-logged-event";
import type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";

type LinkedMatchPeriod = "FIRST_HALF" | "HALF_TIME" | "SECOND_HALF" | "FULL_TIME";

const MATCH_PERIOD: Record<LinkedMatchPeriod, LinkedMatchPeriod> = {
  FIRST_HALF: "FIRST_HALF",
  HALF_TIME: "HALF_TIME",
  SECOND_HALF: "SECOND_HALF",
  FULL_TIME: "FULL_TIME",
};

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

  const linkedMatchIdRef = useRef<string | null>(null);
  linkedMatchIdRef.current = linkedMatchId;
  const [linkedMatchPeriod, setLinkedMatchPeriod] = useState<LinkedMatchPeriod>(
    MATCH_PERIOD.FIRST_HALF,
  );
  const linkedMatchPeriodRef = useRef(linkedMatchPeriod);
  linkedMatchPeriodRef.current = linkedMatchPeriod;

  useEffect(() => {
    setSurfaceMode(initialSurfaceMode);
  }, [initialSurfaceMode]);

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

  const { phase: matchPhase, clockLabelRef: matchClockLabelRef } =
    useSimulatorMatchClock(surfaceMode === "STATS");

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
      });
    },
    [matchClockLabelRef],
  );

  const { events: statsEvents, arm: statsArm, reviewMode, armKind, logTap } =
    useStatsEventLog({
      onStatsEventLogged,
      resolvePeriodPhase: resolveCurrentPeriodPhase,
    });

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

  useEffect(() => {
    if (surfaceMode !== "STATS") return;
    if (statsArm != null) return;
    armKind("SHOT");
  }, [armKind, statsArm, surfaceMode]);

  return (
    <div className="simulator-direct relative h-[100dvh] min-h-0 overflow-hidden bg-[#0b0f0c] text-stone-100">
      <div className="absolute inset-0">
        <div className="h-[100vh] w-full">
          <SimulatorPixiSurface
            sport="gaelic"
            recordingMode={false}
            shadowRecordingMode={false}
            surfaceMode={surfaceMode}
            statsArm={surfaceMode === "STATS" ? statsArm : null}
            statsLoggedEvents={surfaceMode === "STATS" ? statsEvents : []}
            onStatsPitchTap={surfaceMode === "STATS" ? onStatsPitchTapGuarded : undefined}
            statsReviewMode={reviewMode}
            statsPitchInteractive={canStatsPitchLog}
            className="h-full w-full"
          />
        </div>
      </div>

      <MobileControlsOverlay />
    </div>
  );
}
