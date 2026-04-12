import type { StatsLoggedEvent, StatsScoreLoggedEvent } from "@src/features/stats/model/stats-logged-event";

/**
 * Latest score event (by log order) that still needs a scorer.
 */
export function findLatestScorePendingScorer(
  events: readonly StatsLoggedEvent[],
): StatsScoreLoggedEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e?.domain === "score" && e.scorerId == null) return e;
  }
  return undefined;
}

/**
 * Immutable patch: set `scorerId` on the event with `eventId` (score rows only; others unchanged).
 */
export function assignScorerToEvents(
  events: readonly StatsLoggedEvent[],
  eventId: string,
  scorerId: string | null,
): StatsLoggedEvent[] {
  return events.map((e) => {
    if (e.id !== eventId || e.domain !== "score") return e;
    return { ...e, scorerId };
  });
}
