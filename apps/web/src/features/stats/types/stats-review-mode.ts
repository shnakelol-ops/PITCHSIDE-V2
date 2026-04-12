/**
 * Board-centred review (halftime / full-time). Same `StatsLoggedEvent[]` as live; UI + marker emphasis only.
 */
export type StatsReviewMode = "live" | "halftime" | "full_time";

export const STATS_REVIEW_MODES: readonly StatsReviewMode[] = ["live", "halftime", "full_time"];
