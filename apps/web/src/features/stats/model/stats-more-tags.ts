/**
 * Stats V1 "MORE" contextual coaching tags.
 *
 * These are NOT primary pitch events — they enrich the nearest relevant
 * `StatsLoggedEvent` via its optional `contextTags` array. No new kinds,
 * no parallel pipeline, no persistence changes (client-side V1).
 */

import type {
  StatsLoggedEvent,
  StatsPeriodPhase,
} from "@src/features/stats/model/stats-logged-event";

export const STATS_CONTEXT_TAGS = [
  // Group 1 — Decision
  "POOR_DECISION",
  "GOOD_DECISION",
  "FORCED_PLAY",
  "WRONG_OPTION",
  // Group 2 — Execution
  "DROPPED_SHORT",
  "UNDERHIT",
  "OVERHIT",
  "FUMBLE",
  // Group 3 — Turnover detail
  "UNFORCED_TURNOVER",
  "FORCED_TURNOVER",
  "INTERCEPT",
  // Group 4 — Discipline
  "YELLOW_CARD",
  "BLACK_CARD",
  "RED_CARD",
  // Group 5 — Context
  "UNDER_PRESSURE",
  "OVERLAP_MISSED",
  "GOOD_SUPPORT_PLAY",
] as const;

export type StatsContextTag = (typeof STATS_CONTEXT_TAGS)[number];

export type StatsContextTagGroupId =
  | "decision"
  | "execution"
  | "turnover"
  | "discipline"
  | "context";

export type StatsContextTagGroup = {
  id: StatsContextTagGroupId;
  label: string;
  tags: readonly StatsContextTag[];
};

export const STATS_CONTEXT_TAG_GROUPS: readonly StatsContextTagGroup[] = [
  {
    id: "decision",
    label: "Decision",
    tags: ["POOR_DECISION", "GOOD_DECISION", "FORCED_PLAY", "WRONG_OPTION"],
  },
  {
    id: "execution",
    label: "Execution",
    tags: ["DROPPED_SHORT", "UNDERHIT", "OVERHIT", "FUMBLE"],
  },
  {
    id: "turnover",
    label: "Turnover",
    tags: ["UNFORCED_TURNOVER", "FORCED_TURNOVER", "INTERCEPT"],
  },
  {
    id: "discipline",
    label: "Discipline",
    tags: ["YELLOW_CARD", "BLACK_CARD", "RED_CARD"],
  },
  {
    id: "context",
    label: "Context",
    tags: ["UNDER_PRESSURE", "OVERLAP_MISSED", "GOOD_SUPPORT_PLAY"],
  },
];

/** Short, readable UI labels for Recent Events and the MORE bubble. */
export const STATS_CONTEXT_TAG_LABEL: Record<StatsContextTag, string> = {
  POOR_DECISION: "Poor Decision",
  GOOD_DECISION: "Good Decision",
  FORCED_PLAY: "Forced Play",
  WRONG_OPTION: "Wrong Option",
  DROPPED_SHORT: "Dropped Short",
  UNDERHIT: "Underhit",
  OVERHIT: "Overhit",
  FUMBLE: "Fumble",
  UNFORCED_TURNOVER: "Unforced Turnover",
  FORCED_TURNOVER: "Forced Turnover",
  INTERCEPT: "Intercept",
  YELLOW_CARD: "Yellow Card",
  BLACK_CARD: "Black Card",
  RED_CARD: "Red Card",
  UNDER_PRESSURE: "Under Pressure",
  OVERLAP_MISSED: "Overlap Missed",
  GOOD_SUPPORT_PLAY: "Good Support Play",
};

/** Very compact suffix label used in Recent Events row. */
export const STATS_CONTEXT_TAG_SHORT: Record<StatsContextTag, string> = {
  POOR_DECISION: "Poor Decision",
  GOOD_DECISION: "Good Decision",
  FORCED_PLAY: "Forced",
  WRONG_OPTION: "Wrong Option",
  DROPPED_SHORT: "Dropped Short",
  UNDERHIT: "Underhit",
  OVERHIT: "Overhit",
  FUMBLE: "Fumble",
  UNFORCED_TURNOVER: "Unforced",
  FORCED_TURNOVER: "Forced",
  INTERCEPT: "Intercept",
  YELLOW_CARD: "Yellow",
  BLACK_CARD: "Black",
  RED_CARD: "Red",
  UNDER_PRESSURE: "Under Pressure",
  OVERLAP_MISSED: "Overlap Missed",
  GOOD_SUPPORT_PLAY: "Support Play",
};

/**
 * Deterministic "which recent event does this tag attach to?" resolver.
 *
 * Walks events newest-first and returns the first matching row. Returns `null`
 * when no relevant target exists — the UI uses this to render a disabled row
 * (honest feedback, no silent failure).
 */
export function resolveTargetEventId(
  events: readonly StatsLoggedEvent[],
  tag: StatsContextTag,
): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e) continue;
    if (isTagEligibleForEvent(tag, e)) return e.id;
  }
  return null;
}

function isTagEligibleForEvent(
  tag: StatsContextTag,
  event: StatsLoggedEvent,
): boolean {
  switch (tag) {
    // EXECUTION — shot-ish kinds only.
    case "DROPPED_SHORT":
    case "UNDERHIT":
    case "OVERHIT":
    case "FUMBLE":
      return (
        event.kind === "SHOT" ||
        event.kind === "WIDE" ||
        event.kind === "GOAL" ||
        event.kind === "POINT" ||
        event.kind === "TWO_POINT"
      );
    // TURNOVER DETAIL — turnovers only.
    case "UNFORCED_TURNOVER":
    case "FORCED_TURNOVER":
    case "INTERCEPT":
      return event.kind === "TURNOVER_WON" || event.kind === "TURNOVER_LOST";
    // DECISION / CONTEXT / DISCIPLINE — any most recent event is fine.
    case "POOR_DECISION":
    case "GOOD_DECISION":
    case "FORCED_PLAY":
    case "WRONG_OPTION":
    case "UNDER_PRESSURE":
    case "OVERLAP_MISSED":
    case "GOOD_SUPPORT_PLAY":
    case "YELLOW_CARD":
    case "BLACK_CARD":
    case "RED_CARD":
      return true;
  }
}

/** Period phase label used nowhere yet — typed so reducer can accept it if we later timestamp tags. */
export type StatsContextTagPhase = StatsPeriodPhase;
