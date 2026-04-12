"use client";

import type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";
import { cn } from "@pitchside/utils";

export type StatsScorerStripProps = {
  players: readonly StatsRosterPlayer[];
  /** Shown when a score still needs a scorer (latest pending). */
  pendingLabel: string | null;
  /** Next score tap will pre-fill this scorer (one-shot). */
  preferredScorerId: string | null;
  onPickPlayer: (playerId: string) => void;
  onClearPreferred: () => void;
};

/**
 * Single wrap row — no scroll container; board stays centre.
 */
export function StatsScorerStrip({
  players,
  pendingLabel,
  preferredScorerId,
  onPickPlayer,
  onClearPreferred,
}: StatsScorerStripProps) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-emerald-100/65">
        <span className="font-bold uppercase tracking-wide text-emerald-200/75">Scorer</span>
        {pendingLabel ? (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-100/90">
            {pendingLabel}
          </span>
        ) : preferredScorerId ? (
          <span className="text-emerald-100/80">Next score → selected player</span>
        ) : (
          <span className="text-emerald-100/55">Tag last score, or pick before next score tap</span>
        )}
        {preferredScorerId ? (
          <button
            type="button"
            className="rounded border border-white/20 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-emerald-100/80 hover:bg-white/10"
            onClick={onClearPreferred}
          >
            Clear next
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {players.map((p) => {
          const isPreferred = preferredScorerId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={cn(
                "max-w-[7.5rem] truncate rounded-md border px-2 py-1 text-[9px] font-semibold transition",
                isPreferred
                  ? "border-emerald-300/60 bg-emerald-500/30 text-emerald-50"
                  : "border-white/15 bg-white/5 text-emerald-100/90 hover:border-white/25 hover:bg-white/10",
              )}
              title={p.name}
              onClick={() => onPickPlayer(p.id)}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
