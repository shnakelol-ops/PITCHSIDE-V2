"use client";

import { useCallback, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import {
  STATS_CONTEXT_TAG_GROUPS,
  STATS_CONTEXT_TAG_LABEL,
  resolveTargetEventId,
  type StatsContextTag,
} from "@src/features/stats/model/stats-more-tags";
import { cn } from "@pitchside/utils";

export type StatsMoreMenuProps = {
  /** Last-N logged events used to resolve the attachment target per tag. */
  events: readonly StatsLoggedEvent[];
  /** Same `canLog` gate as primary actions — disabled outside live play. */
  canLog: boolean;
  /** Dispatch tag apply. Reducer no-ops on no target, but UI also greys-out. */
  onApply: (tag: StatsContextTag) => void;
};

const BTN_BASE =
  "min-h-11 min-w-[4.25rem] justify-center rounded-[10px] px-3.5 py-2 text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)] transition-[transform,box-shadow,background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070A0E] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap";

const BTN_IDLE =
  "!border !border-white/[0.08] !bg-[rgba(22,26,32,0.92)] !text-[rgba(230,234,242,0.92)] hover:!border-white/[0.16] hover:!bg-[rgba(30,34,42,0.96)] hover:!text-white";

const BTN_OPEN =
  "!border !border-[rgba(90,167,255,0.45)] !bg-[rgba(26,44,70,0.92)] !text-[rgba(208,228,250,0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(90,167,255,0.22),0_0_16px_-6px_rgba(90,167,255,0.55)]";

/**
 * Compact "MORE" utility bubble for Stats V1.
 *
 * Contextual coaching tags — NOT primary events. Selecting a tag attaches it
 * to the most recent relevant logged event via `onApply` and closes the bubble.
 * Rows with no valid target are disabled (honest, no silent failure).
 *
 * Renders through a Radix Portal so it escapes the action bar's horizontal
 * scroll container. Same popover primitive for desktop and mobile.
 */
export function StatsMoreMenu({ events, canLog, onApply }: StatsMoreMenuProps) {
  const [open, setOpen] = useState(false);

  // Compute once per open — cheap O(tags * events) over the last N rows.
  const eligibility = useMemo(() => {
    const map = {} as Record<StatsContextTag, boolean>;
    for (const g of STATS_CONTEXT_TAG_GROUPS) {
      for (const t of g.tags) {
        map[t] = resolveTargetEventId(events, t) !== null;
      }
    }
    return map;
  }, [events]);

  const hasAnyEligible = useMemo(
    () => Object.values(eligibility).some(Boolean),
    [eligibility],
  );

  const pick = useCallback(
    (tag: StatsContextTag) => {
      if (!eligibility[tag]) return;
      onApply(tag);
      setOpen(false);
    },
    [eligibility, onApply],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Open more contextual tags"
          disabled={!canLog}
          className={cn(BTN_BASE, open ? BTN_OPEN : BTN_IDLE)}
        >
          <MoreHorizontal className="mr-1 h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          More
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[12px] border border-white/[0.1] bg-[rgba(14,17,22,0.98)] p-2 text-slate-100 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[10px]",
        )}
      >
        {!hasAnyEligible ? (
          <p className="px-2 py-3 text-[10.5px] leading-snug text-slate-400/80">
            No recent event to tag yet. Log an event first, then add context.
          </p>
        ) : null}

        <div
          role="menu"
          aria-label="More contextual tags"
          className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto"
        >
          {STATS_CONTEXT_TAG_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 px-1">
                <span
                  className="h-[2px] w-2 shrink-0 rounded-full bg-gradient-to-r from-[rgba(90,167,255,0.45)] to-[rgba(90,167,255,0.05)]"
                  aria-hidden
                />
                <span
                  className="text-[8.5px] font-semibold uppercase leading-none tracking-[0.22em] text-[rgba(228,232,240,0.55)]"
                  style={{ fontFeatureSettings: '"ss01" 1' }}
                >
                  {group.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.tags.map((t) => {
                  const enabled = eligibility[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      role="menuitem"
                      disabled={!enabled}
                      onClick={() => pick(t)}
                      className={cn(
                        "min-h-9 flex-1 rounded-[8px] border px-2 py-1.5 text-[10.5px] font-semibold leading-tight transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12]",
                        enabled
                          ? "border-white/[0.08] bg-white/[0.02] text-slate-100/95 hover:border-white/[0.18] hover:bg-white/[0.06]"
                          : "cursor-not-allowed border-white/[0.04] bg-white/[0.01] text-slate-500/70",
                      )}
                      style={{ minWidth: "6.25rem" }}
                    >
                      {STATS_CONTEXT_TAG_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-2 border-t border-white/[0.05] px-1 pt-1.5 text-[9px] leading-snug text-slate-400/65">
          Tag attaches to the most recent relevant event.
        </p>
      </PopoverContent>
    </Popover>
  );
}
