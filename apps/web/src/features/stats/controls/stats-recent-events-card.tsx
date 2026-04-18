"use client";

import { memo, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@pitchside/utils";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import { STATS_CONTEXT_TAG_SHORT } from "@src/features/stats/model/stats-more-tags";
import type { StatsV1EventKind } from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";

const MAX_RECENT = 6;

const KIND_LABEL: Record<StatsV1EventKind, string> = {
  GOAL: "Goal",
  POINT: "Point",
  TWO_POINT: "2PT",
  WIDE: "Wide",
  TURNOVER_WON: "Turnover Won",
  TURNOVER_LOST: "Turnover Lost",
  KICKOUT_WON: "Kickout Won",
  KICKOUT_LOST: "Kickout Lost",
  FREE_WON: "Free Won",
  FREE_CONCEDED: "Free Conceded",
  SHOT: "Shot",
};

type DotTone = "green" | "red" | "blue" | "neutral";

const KIND_TONE: Record<StatsV1EventKind, DotTone> = {
  GOAL: "green",
  POINT: "green",
  TWO_POINT: "green",
  WIDE: "red",
  FREE_CONCEDED: "red",
  TURNOVER_LOST: "red",
  KICKOUT_LOST: "red",
  TURNOVER_WON: "blue",
  FREE_WON: "blue",
  KICKOUT_WON: "blue",
  SHOT: "neutral",
};

const TONE_DOT_CLASS: Record<DotTone, string> = {
  green:
    "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.55)] ring-1 ring-emerald-300/30",
  red: "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.5)] ring-1 ring-rose-300/30",
  blue: "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.55)] ring-1 ring-sky-300/30",
  neutral: "bg-slate-400/70 ring-1 ring-slate-300/20",
};

export type StatsRecentEventsCardProps = {
  events: readonly StatsLoggedEvent[];
  players: readonly StatsRosterPlayer[];
  className?: string;
};

/**
 * Compact live memory aid shown below Scorer + Voice rails in Stats mode.
 *
 * Pure read slice over the existing event log — no state mirroring, no writes.
 * Events display without minutes by design: `StatsLoggedEvent` stores only
 * `timestampMs` and no match-minute field, and the spec says to omit minutes
 * gracefully when unavailable.
 */
function StatsRecentEventsCardInner({
  events,
  players,
  className,
}: StatsRecentEventsCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) map.set(p.id, p.name);
    return map;
  }, [players]);

  const recent = useMemo(() => {
    if (events.length === 0) return [] as StatsLoggedEvent[];
    const start = Math.max(0, events.length - MAX_RECENT);
    const slice = events.slice(start);
    slice.reverse();
    return slice;
  }, [events]);

  const total = events.length;

  return (
    <section
      aria-label="Recent events"
      className={cn(
        "relative overflow-hidden rounded-[12px] border backdrop-blur-[6px]",
        "border-white/[0.08] bg-[rgba(18,20,24,0.58)]",
        "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(148,185,230,0.18) 50%, transparent 100%)",
        }}
        aria-hidden
      />
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-controls="recent-events-body"
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors",
          "hover:bg-white/[0.02] focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12]",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-[rgba(90,167,255,0.5)] to-[rgba(90,167,255,0.1)]"
            aria-hidden
          />
          <span
            className="text-[9.5px] font-semibold uppercase leading-none tracking-[0.26em] text-[rgba(228,232,240,0.82)]"
            style={{ fontFeatureSettings: "\"ss01\" 1" }}
          >
            Recent Events
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-white/[0.06] bg-black/25 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-[rgba(228,232,240,0.6)]">
            {total}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-slate-400/70 transition-transform duration-150",
              collapsed ? "-rotate-90" : "rotate-0",
            )}
            strokeWidth={2}
          />
        </div>
      </button>
      {!collapsed ? (
        <div
          id="recent-events-body"
          className="max-h-44 overflow-y-auto border-t border-white/[0.05] px-2 py-1.5"
        >
          {recent.length === 0 ? (
            <p className="px-1.5 py-2 text-[10px] text-slate-400/65">
              No events logged yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5" role="list">
              {recent.map((e) => {
                const tone = KIND_TONE[e.kind] ?? "neutral";
                const label = KIND_LABEL[e.kind] ?? e.kind;
                const scorer = e.playerId
                  ? playerNameById.get(e.playerId) ?? null
                  : null;
                const tagSuffix =
                  e.contextTags && e.contextTags.length > 0
                    ? e.contextTags
                        .map((t) => STATS_CONTEXT_TAG_SHORT[t] ?? t)
                        .join(", ")
                    : null;
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 rounded-[8px] px-1.5 py-1 transition-colors hover:bg-white/[0.03]"
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        TONE_DOT_CLASS[tone],
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-[10.5px] font-medium text-slate-100/92">
                      {label}
                      {tagSuffix ? (
                        <span className="text-[rgba(208,228,250,0.85)]">
                          {" · "}
                          {tagSuffix}
                        </span>
                      ) : null}
                      {scorer ? (
                        <span className="text-slate-300/75"> – {scorer}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

export const StatsRecentEventsCard = memo(StatsRecentEventsCardInner);
