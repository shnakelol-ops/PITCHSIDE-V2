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
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

const REVIEW_CHIPS: { mode: StatsReviewMode; label: string }[] = [
  { mode: "live", label: "Live" },
  { mode: "halftime", label: "Review · HT" },
  { mode: "full_time", label: "Review · FT" },
];

function armLabel(arm: ReturnType<typeof useStatsEventLog>["arm"]): string {
  if (!arm) return "Select a type, then tap the pitch";
  return arm.replace(/_/g, " ").toLowerCase();
}

function chipClass(active: boolean) {
  return cn(
    "rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide transition-transform touch-manipulation active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
    active
      ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-50"
      : "border-white/15 bg-white/5 text-emerald-100/85 hover:border-white/25 hover:bg-white/10",
  );
}

function reviewChipClass(active: boolean) {
  return cn(
    "rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wide transition-transform touch-manipulation active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
    active
      ? "border-amber-400/70 bg-amber-500/20 text-amber-50"
      : "border-white/12 bg-white/[0.04] text-emerald-100/75 hover:border-amber-300/35 hover:bg-white/[0.07]",
  );
}

export type StatsBoardPhase5Props = {
  players?: readonly StatsRosterPlayer[];
};

/**
 * Phase 5: Phase 4 logging + halftime/full-time review on the same pitch (emphasis, no new data).
 */
export function StatsBoardPhase5({ players = STATS_DEV_PLACEHOLDER_ROSTER }: StatsBoardPhase5Props) {
  const {
    events,
    arm,
    activeScorerId,
    reviewMode,
    armKind,
    clearArm,
    logTap,
    resetEvents,
    setActiveScorer,
    setReviewMode,
  } = useStatsEventLog();

  const isLive = reviewMode === "live";
  const pending = useMemo(() => findLatestScorePendingScorer(events), [events]);
  const pendingLabel = useMemo(() => {
    if (!pending) return null;
    return `Tag ${pending.kind.replace(/_/g, " ").toLowerCase()}`;
  }, [pending]);

  return (
    <StatsBoardShell
      className={cn(
        "min-h-[28rem]",
        !isLive && "ring-1 ring-amber-400/25 ring-offset-0 ring-offset-transparent",
      )}
    >
      <div className="relative z-10 flex shrink-0 flex-col gap-2 border-b border-white/[0.08] px-2 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/80">
            Stats · Phase 5
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className="rounded border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-100/80 hover:bg-white/10"
              onClick={clearArm}
              disabled={!isLive}
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

        <div className="flex flex-wrap items-center gap-1">
          {REVIEW_CHIPS.map(({ mode, label }) => (
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
        {!isLive ? (
          <p className="text-[9px] font-medium leading-snug text-amber-100/85">
            Review: red = wides; cyan vs pink = turnover won/lost; sky vs violet = kickout won/lost;
            amber vs grey = free won/conceded; blue ring = shots; greens = scores. Switch to Live to log.
          </p>
        ) : null}

        <div className={cn(!isLive && "pointer-events-none opacity-[0.38]")}>
          <p className="text-[10px] text-emerald-100/70">{armLabel(arm)}</p>
          <div className="mt-1 flex flex-wrap gap-1">
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
          <div className="mt-1.5 flex flex-wrap gap-1 border-t border-white/[0.06] pt-1.5">
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
          <div className="mt-1.5">
            <StatsScorerStrip
              players={players}
              pendingLabel={pendingLabel}
              activeScorerId={activeScorerId}
              onSetActiveScorer={setActiveScorer}
            />
          </div>
        </div>

        <p className="font-mono text-[10px] tabular-nums text-emerald-100/60">
          Logged: {events.length}
        </p>
      </div>
      <div
        className={cn(
          "relative z-0 flex min-h-0 min-w-0 flex-1",
          !isLive && "rounded-lg ring-1 ring-inset ring-amber-400/20",
        )}
      >
        <div className="flex h-full min-h-0 w-full items-center justify-center p-2">
          <StatsPitchSurface
            className="h-full max-h-full w-full max-w-full"
            onPitchTap={isLive ? logTap : undefined}
            loggedEvents={events}
            reviewMode={reviewMode}
          />
        </div>
      </div>
    </StatsBoardShell>
  );
}
