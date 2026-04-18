/**
 * Stats V1 review scope.
 *
 * - "live" — live logging view (auto-scoped to current half on the pitch).
 * - "1h"  — review first-half events only (includes half_time captures).
 * - "2h"  — review second-half events only (includes full_time captures).
 * - "all" — review the full match (both halves).
 *
 * Same `StatsLoggedEvent[]` as live; UI + marker emphasis only. Non-destructive.
 */
export type StatsReviewMode = "live" | "1h" | "2h" | "all";

export const STATS_REVIEW_MODES: readonly StatsReviewMode[] = [
  "live",
  "1h",
  "2h",
  "all",
];
