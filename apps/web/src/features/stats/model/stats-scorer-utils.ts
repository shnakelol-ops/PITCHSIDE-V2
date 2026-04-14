import {
  isStatsV1ScoreKind,
  type StatsV1ScoreKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";

/**
 * Latest score event (by log order) that still needs a player attribution.
 */
export function findLatestScorePendingScorer(
  events: readonly StatsLoggedEvent[],
): (StatsLoggedEvent & { kind: StatsV1ScoreKind }) | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e && isStatsV1ScoreKind(e.kind) && e.playerId == null) {
      return e as StatsLoggedEvent & { kind: StatsV1ScoreKind };
    }
  }
  return undefined;
}

/**
 * Immutable patch: set `playerId` on the score event with `eventId` (other rows unchanged).
 */
export function assignScorerToEvents(
  events: readonly StatsLoggedEvent[],
  eventId: string,
  playerId: string | null,
): StatsLoggedEvent[] {
  return events.map((e) => {
    if (e.id !== eventId || !isStatsV1ScoreKind(e.kind)) return e;
    return { ...e, playerId };
  });
}
