"use client";

import type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";
import { cn } from "@pitchside/utils";

export type StatsScorerStripProps = {
  players: readonly StatsRosterPlayer[];
  /** Shown when a score still needs a scorer (latest pending). */
  pendingLabel: string | null;
  /** Active scorer: applied to every score tap until changed (null = no player). */
  activeScorerId: string | null;
  onSetActiveScorer: (playerId: string | null) => void;
};

/**
 * Single wrap row — no scroll container; board stays centre.
 */
export function StatsScorerStrip({
  players,
  pendingLabel,
  activeScorerId,
  onSetActiveScorer,
}: StatsScorerStripProps) {
  const noPlayerActive = activeScorerId == null;
  return (
    <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-emerald-100/65">
        <span className="font-bold uppercase tracking-wide text-emerald-200/75">Scorer</span>
        {pendingLabel ? (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-100/90">
            {pendingLabel}
          </span>
        ) : null}
        <span className="text-emerald-100/70">
          {activeScorerId
            ? "Active player — scores use this until you change it"
            : "No player — fast logging; pick a name to attribute scores"}
        </span>
      </div>
      <div
        className="flex gap-1 overflow-x-auto pb-1 pr-0.5"
        role="group"
        aria-label="Scorer selection"
      >
        <button
          type="button"
          className={cn(
            "shrink-0 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide transition",
            noPlayerActive
              ? "border-slate-300/50 bg-slate-500/25 text-slate-50"
              : "border-white/15 bg-white/5 text-emerald-100/85 hover:border-white/25 hover:bg-white/10",
          )}
          onClick={() => onSetActiveScorer(null)}
        >
          No player
        </button>
        {players.map((p) => {
          const isActive = activeScorerId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={cn(
                "shrink-0 rounded-md border px-2 py-1 text-[9px] font-semibold transition",
                isActive
                  ? "border-emerald-300/60 bg-emerald-500/30 text-emerald-50"
                  : "border-white/15 bg-white/5 text-emerald-100/90 hover:border-white/25 hover:bg-white/10",
              )}
              title={`#${p.number} ${p.name}`}
              onClick={() => onSetActiveScorer(p.id)}
            >
              <span className="mr-1 rounded-sm bg-black/15 px-1 py-0.5 text-[8px] font-bold tabular-nums">
                #{p.number}
              </span>
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
