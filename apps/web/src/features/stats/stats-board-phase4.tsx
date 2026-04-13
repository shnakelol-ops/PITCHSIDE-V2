"use client";

import { useMemo } from "react";

import { StatsBoardShell } from "@src/features/stats/board/stats-board-shell";
import { StatsPitchSurface } from "@src/features/stats/board/stats-pitch-surface";
import { StatsScorerStrip } from "@src/features/stats/controls/stats-scorer-strip";
import { useStatsEventLog } from "@src/features/stats/hooks/use-stats-event-log";
import { findLatestScorePendingScorer } from "@src/features/stats/model/stats-scorer-utils";
import {
  STATS_V1_FIELD_KINDS,
  STATS_V1_SCORE_KINDS,
} from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";
import { STATS_DEV_PLACEHOLDER_ROSTER } from "@src/features/stats/types/stats-roster";
import { cn } from "@pitchside/utils";

function armLabel(arm: ReturnType<typeof useStatsEventLog>["arm"]): string {
  if (!arm) return "Select a type, then tap the pitch";
  return arm.replace(/_/g, " ").toLowerCase();
}

function chipClass(active: boolean) {
  return cn(
    "rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide transition",
    active
      ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-50"
      : "border-white/15 bg-white/5 text-emerald-100/85 hover:border-white/25 hover:bg-white/10",
  );
}

export type StatsBoardPhase4Props = {
  /** Replace with match roster when wired; defaults to dev placeholders. */
  players?: readonly StatsRosterPlayer[];
};

/**
 * Phase 4: score logging + optional pre-tap scorer + post-tap attribution on same model.
 */
export function StatsBoardPhase4({ players = STATS_DEV_PLACEHOLDER_ROSTER }: StatsBoardPhase4Props) {
  const {
    events,
    arm,
    activeScorerId,
    armKind,
    clearArm,
    logTap,
    resetEvents,
    setActiveScorer,
  } = useStatsEventLog();

  const pending = useMemo(() => findLatestScorePendingScorer(events), [events]);
  const pendingLabel = useMemo(() => {
    if (!pending) return null;
    return `Tag ${pending.kind.replace(/_/g, " ").toLowerCase()}`;
  }, [pending]);

  return (
    <StatsBoardShell className="min-h-[28rem]">
      <div className="relative z-10 flex shrink-0 flex-col gap-2 border-b border-white/[0.08] px-2 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/80">
            Stats · Phase 4
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className="rounded border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-100/80 hover:bg-white/10"
              onClick={clearArm}
            >
              Clear arm
            </button>
            <button
              type="button"
              className="rounded border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-amber-100/80 hover:bg-white/10"
              onClick={resetEvents}
            >
              Clear log
            </button>
          </div>
        </div>
        <p className="text-[10px] text-emerald-100/70">{armLabel(arm)}</p>
        <div className="flex flex-wrap gap-1">
          {STATS_V1_FIELD_KINDS.map((t) => (
            <button
              key={t}
              type="button"
              className={chipClass(arm === t)}
              onClick={() => armKind(t)}
            >
              {t.replace(/_/g, " ").toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 border-t border-white/[0.06] pt-1.5">
          {STATS_V1_SCORE_KINDS.map((t) => (
            <button
              key={t}
              type="button"
              className={chipClass(arm === t)}
              onClick={() => armKind(t)}
            >
              {t.replace(/_/g, " ").toLowerCase()}
            </button>
          ))}
        </div>
        <StatsScorerStrip
          players={players}
          pendingLabel={pendingLabel}
          activeScorerId={activeScorerId}
          onSetActiveScorer={setActiveScorer}
        />
        <p className="font-mono text-[10px] tabular-nums text-emerald-100/60">
          Logged: {events.length}
        </p>
      </div>
      <div className="relative z-0 flex min-h-0 min-w-0 flex-1">
        <div className="flex h-full min-h-0 w-full items-center justify-center p-2">
          <StatsPitchSurface
            className="h-full max-h-full w-full max-w-full"
            onPitchTap={logTap}
            loggedEvents={events}
          />
        </div>
      </div>
    </StatsBoardShell>
  );
}
