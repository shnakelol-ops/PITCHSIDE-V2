/**
 * Single source of truth for V1 STATS event kinds (Pitchside product list).
 * Persisted rows use `MatchEventType` + optional `context.logEventType` — see `stats-logged-event-to-match-event.ts`.
 */

export const STATS_V1_FIELD_KINDS = [
  "TURNOVER_WON",
  "TURNOVER_LOST",
  "KICKOUT_WON",
  "KICKOUT_LOST",
  "FREE_WON",
  "FREE_CONCEDED",
  "WIDE",
  "SHOT",
] as const;

export type StatsV1FieldKind = (typeof STATS_V1_FIELD_KINDS)[number];

export const STATS_V1_SCORE_KINDS = ["GOAL", "POINT", "TWO_POINT"] as const;

export type StatsV1ScoreKind = (typeof STATS_V1_SCORE_KINDS)[number];

export type StatsV1EventKind = StatsV1FieldKind | StatsV1ScoreKind;

export const STATS_V1_EVENT_KINDS: readonly StatsV1EventKind[] = [
  ...STATS_V1_FIELD_KINDS,
  ...STATS_V1_SCORE_KINDS,
];

export function isStatsV1ScoreKind(k: StatsV1EventKind): k is StatsV1ScoreKind {
  return (STATS_V1_SCORE_KINDS as readonly string[]).includes(k);
}

/** Stable `context.logEventType` fragment for non-score kinds (lowercase_snake). */
export function statsV1KindToLogEventType(kind: StatsV1EventKind): string {
  if (isStatsV1ScoreKind(kind)) return `stats_score:${kind}`;
  return kind.toLowerCase();
}
