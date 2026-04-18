"use client";

import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
 * Fast scorer selector.
 *
 * Interaction: the trigger shows the current active scorer (or "No player").
 * Tapping opens a floating popover bubble anchored under the trigger containing
 * "No player" at the top and the full roster beneath. Selection is instant and
 * closes the popover. Renders via Radix Portal so it escapes clipping ancestors
 * (`overflow-hidden` on the enclosing rail card, scrollable rail, etc.).
 *
 * Assignment logic (`onSetActiveScorer`) is unchanged.
 */
export function StatsScorerStrip({
  players,
  pendingLabel,
  activeScorerId,
  onSetActiveScorer,
}: StatsScorerStripProps) {
  const [open, setOpen] = useState(false);

  const activePlayer =
    activeScorerId != null
      ? players.find((p) => p.id === activeScorerId) ?? null
      : null;

  const pick = useCallback(
    (playerId: string | null) => {
      onSetActiveScorer(playerId);
      setOpen(false);
    },
    [onSetActiveScorer],
  );

  return (
    <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-1.5">
      {/* Label row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-emerald-100/70">
        <span className="font-bold uppercase tracking-wide text-emerald-200/75">
          Scorer
        </span>
        {pendingLabel ? (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-100/90">
            {pendingLabel}
          </span>
        ) : null}
      </div>

      {/* Trigger + anchored popover (portal-rendered) */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            className={cn(
              "flex min-h-9 w-full items-center justify-between gap-2 rounded-[10px] border px-2.5 py-1.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12]",
              activePlayer
                ? "border-emerald-300/35 bg-[rgba(16,40,28,0.82)] text-emerald-50 hover:border-emerald-300/55 hover:bg-[rgba(20,48,34,0.88)]"
                : "border-white/[0.08] bg-white/[0.02] text-slate-200/90 hover:border-white/[0.16] hover:bg-white/[0.06]",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {activePlayer ? (
                <>
                  <span className="inline-flex h-5 min-w-[1.6rem] items-center justify-center rounded-[5px] bg-black/25 px-1 text-[9px] font-bold tabular-nums text-emerald-100/95">
                    #{activePlayer.number}
                  </span>
                  <span className="truncate text-[11px] font-semibold">
                    {activePlayer.name}
                  </span>
                </>
              ) : (
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-300/85">
                  No player
                </span>
              )}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-slate-300/75 transition-transform duration-100",
                open && "rotate-180",
              )}
              strokeWidth={2}
              aria-hidden
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            // Compact floating bubble — readable, touch-friendly, no search.
            "w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-[12px] border border-white/[0.1] bg-[rgba(14,17,22,0.98)] p-1 text-slate-100 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[10px]",
          )}
        >
          <div
            role="listbox"
            aria-label="Select active scorer"
            className="flex max-h-72 flex-col overflow-y-auto"
          >
            <button
              type="button"
              role="option"
              aria-selected={activeScorerId == null}
              onClick={() => pick(null)}
              className={cn(
                "flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
                activeScorerId == null
                  ? "bg-[rgba(90,167,255,0.14)] text-[rgba(208,228,250,0.98)]"
                  : "text-slate-200/90 hover:bg-white/[0.06]",
              )}
            >
              <span>No player</span>
              {activeScorerId == null ? (
                <span
                  className="size-1.5 rounded-full bg-[rgba(90,167,255,0.85)] shadow-[0_0_6px_rgba(90,167,255,0.5)]"
                  aria-hidden
                />
              ) : null}
            </button>
            <div className="my-1 h-px shrink-0 bg-white/[0.06]" aria-hidden />
            {players.map((p) => {
              const isActive = activeScorerId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => pick(p.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-50"
                      : "text-slate-100/90 hover:bg-white/[0.06]",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded-[5px] bg-black/30 px-1 text-[9px] font-bold tabular-nums text-slate-100/95">
                      #{p.number}
                    </span>
                    <span className="truncate">{p.name}</span>
                  </span>
                  {isActive ? (
                    <span
                      className="size-1.5 rounded-full bg-emerald-300/90 shadow-[0_0_6px_rgba(134,239,172,0.55)]"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <span className="px-0.5 text-[9px] leading-snug text-slate-400/70">
        {activePlayer
          ? "Scores attribute to this player until changed."
          : "Fast logging — pick a name to attribute scores."}
      </span>
    </div>
  );
}
