"use client";

import { Button } from "@/components/ui/button";
import type { StatsArmSelection } from "@src/features/stats/hooks/use-stats-event-log";
import type { StatsV1EventKind } from "@src/features/stats/model/stats-v1-event-kind";
import { cn } from "@pitchside/utils";

/**
 * Event-kind groupings per launch spec (all kinds come from
 * `STATS_V1_EVENT_KINDS` — no new kinds, no remapping).
 *
 *   Scoring    — GOAL, POINT, TWO_POINT, WIDE
 *   Possession — TURNOVER_WON, TURNOVER_LOST, KICKOUT_WON, KICKOUT_LOST
 *   Set-piece  — FREE_WON, FREE_CONCEDED, SHOT
 */
type Group = {
  id: string;
  label: string;
  accent: "green" | "blue" | "amber";
  kinds: readonly StatsV1EventKind[];
};

const GROUPS: readonly Group[] = [
  {
    id: "scoring",
    label: "Scoring",
    accent: "green",
    kinds: ["GOAL", "POINT", "TWO_POINT", "WIDE"],
  },
  {
    id: "possession",
    label: "Possession",
    accent: "blue",
    kinds: ["TURNOVER_WON", "TURNOVER_LOST", "KICKOUT_WON", "KICKOUT_LOST"],
  },
  {
    id: "setpiece",
    label: "Set-piece",
    accent: "amber",
    kinds: ["FREE_WON", "FREE_CONCEDED", "SHOT"],
  },
];

const LABELS: Record<StatsV1EventKind, string> = {
  GOAL: "Goal",
  POINT: "Point",
  TWO_POINT: "2 Point",
  WIDE: "Wide",
  TURNOVER_WON: "T. Won",
  TURNOVER_LOST: "T. Lost",
  KICKOUT_WON: "KO Won",
  KICKOUT_LOST: "KO Lost",
  FREE_WON: "Free Won",
  FREE_CONCEDED: "Free Conceded",
  SHOT: "Shot",
};

const BTN_BASE =
  "min-h-11 min-w-[5.75rem] justify-center rounded-[10px] px-3.5 py-2 text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)] transition-[transform,box-shadow,background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070A0E] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap";

const BTN_IDLE =
  "!border !border-white/[0.08] !bg-[rgba(22,26,32,0.92)] !text-[rgba(230,234,242,0.92)] hover:!border-white/[0.16] hover:!bg-[rgba(30,34,42,0.96)] hover:!text-white";

const ACCENT_ON: Record<Group["accent"], string> = {
  green:
    "!border !border-emerald-400/40 !bg-[rgba(22,46,34,0.92)] !text-[rgba(209,250,229,0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(16,185,129,0.18),0_0_16px_-6px_rgba(16,185,129,0.55)]",
  blue:
    "!border !border-[rgba(90,167,255,0.4)] !bg-[rgba(26,44,70,0.92)] !text-[rgba(208,228,250,0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(90,167,255,0.2),0_0_16px_-6px_rgba(90,167,255,0.55)]",
  amber:
    "!border !border-amber-400/40 !bg-[rgba(48,38,16,0.92)] !text-[rgba(254,243,199,0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(245,158,11,0.2),0_0_16px_-6px_rgba(245,158,11,0.55)]",
};

const GROUP_DOT: Record<Group["accent"], string> = {
  green: "bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.6)]",
  blue: "bg-[rgba(90,167,255,0.85)] shadow-[0_0_6px_rgba(90,167,255,0.55)]",
  amber: "bg-amber-400/80 shadow-[0_0_6px_rgba(245,158,11,0.55)]",
};

export type StatsActionBarProps = {
  /** Currently armed kind (from `useStatsEventLog`), or null. */
  armedKind: StatsArmSelection;
  /** True when logging is permitted (live phase + running). */
  canLog: boolean;
  /** Arm the given kind (next pitch tap logs it). */
  onArm: (kind: StatsV1EventKind) => void;
};

/**
 * Fast event-logging surface across the full width of the screen.
 * Clean grouped clusters; one-tap arm; respects `canLog` gate.
 */
export function StatsActionBar({ armedKind, canLog, onArm }: StatsActionBarProps) {
  return (
    <footer
      className="relative z-20 shrink-0 border-t border-white/[0.06] px-3 py-2.5 backdrop-blur-[8px] sm:px-4 sm:py-3 lg:px-6"
      style={{
        backgroundColor: "rgba(10,13,18,0.82)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.03), 0 -8px 24px -12px rgba(0,0,0,0.6)",
      }}
      aria-label="Stats event logging bar"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(148,185,230,0.2) 50%, transparent 100%)",
        }}
        aria-hidden
      />
      <div
        className={cn(
          "flex items-center gap-3 overflow-x-auto pb-0.5",
          !canLog && "pointer-events-none opacity-50",
        )}
      >
        {GROUPS.map((group, i) => (
          <div key={group.id} className="flex shrink-0 items-center gap-2">
            {i > 0 ? (
              <div className="mx-1 h-7 w-px shrink-0 bg-white/[0.08]" aria-hidden />
            ) : null}
            <span
              className="flex shrink-0 items-center gap-1.5 pr-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.22em] text-[rgba(228,232,240,0.55)]"
              aria-hidden
            >
              <span className={cn("size-1 rounded-full", GROUP_DOT[group.accent])} aria-hidden />
              {group.label}
            </span>
            <div
              className="flex shrink-0 items-center gap-1.5"
              role="group"
              aria-label={`${group.label} actions`}
            >
              {group.kinds.map((k) => {
                const on = armedKind === k;
                return (
                  <Button
                    key={`${group.id}-${k}`}
                    type="button"
                    variant="secondary"
                    aria-pressed={on}
                    onClick={() => onArm(k)}
                    className={cn(BTN_BASE, on ? ACCENT_ON[group.accent] : BTN_IDLE)}
                  >
                    {LABELS[k]}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
