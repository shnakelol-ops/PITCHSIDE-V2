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
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={cn(
            "rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide transition",
            noPlayerActive
              ? "border-slate-300/50 bg-slate-500/25 text-slate-50"
              : "border-white/15 bg-white/5 text-emerald-100/85 hover:border-white/25 hover:bg-white/10",
          )}
          data-tap-target-id="scorer-none"
          data-tap-target-group="stats"
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
                "max-w-[7.5rem] truncate rounded-md border px-2 py-1 text-[9px] font-semibold transition",
                isActive
                  ? "border-emerald-300/60 bg-emerald-500/30 text-emerald-50"
                  : "border-white/15 bg-white/5 text-emerald-100/90 hover:border-white/25 hover:bg-white/10",
              )}
              title={p.name}
              data-tap-target-id={`scorer-${p.id}`}
              data-tap-target-group="stats"
              onClick={() => onSetActiveScorer(p.id)}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
