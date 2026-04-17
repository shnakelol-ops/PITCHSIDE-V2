"use client";

import { useMemo } from "react";

import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import type { StatsV1EventKind } from "@src/features/stats/model/stats-v1-event-kind";
import { cn } from "@pitchside/utils";

export type StatsUtilitySummaryProps = {
  events: readonly StatsLoggedEvent[];
  className?: string;
};

type Counts = {
  wides: number;
  kickoutWon: number;
  kickoutLost: number;
  turnoverWon: number;
  turnoverLost: number;
};

function tally(events: readonly StatsLoggedEvent[]): Counts {
  const c: Counts = {
    wides: 0,
    kickoutWon: 0,
    kickoutLost: 0,
    turnoverWon: 0,
    turnoverLost: 0,
  };
  for (const e of events) {
    const k: StatsV1EventKind = e.kind;
    switch (k) {
      case "WIDE":
        c.wides += 1;
        break;
      case "KICKOUT_WON":
        c.kickoutWon += 1;
        break;
      case "KICKOUT_LOST":
        c.kickoutLost += 1;
        break;
      case "TURNOVER_WON":
        c.turnoverWon += 1;
        break;
      case "TURNOVER_LOST":
        c.turnoverLost += 1;
        break;
      default:
        break;
    }
  }
  return c;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1">
      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400/75">
        {label}
      </span>
      <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-100/95">
        {value}
      </span>
    </div>
  );
}

/**
 * Tiny at-a-glance summary derived purely from the existing event log.
 * No charts, no tables, no dashboard treatment — per launch spec.
 */
export function StatsUtilitySummary({
  events,
  className,
}: StatsUtilitySummaryProps) {
  const c = useMemo(() => tally(events), [events]);
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-white/[0.04] rounded-[10px] border border-white/[0.06] bg-black/25 px-2 py-1",
        className,
      )}
      role="group"
      aria-label="Live utility summary"
    >
      <Row label="Wides" value={c.wides} />
      <Row label="Kickouts" value={`${c.kickoutWon}–${c.kickoutLost}`} />
      <Row label="Turnovers" value={`${c.turnoverWon}–${c.turnoverLost}`} />
    </div>
  );
}
