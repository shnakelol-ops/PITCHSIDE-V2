/**
 * STATS `StatsLoggedEvent` → `CreateMatchEventInput` for `POST /api/events`.
 * Single mapping table: V1 `kind` → API `type` + `context.logEventType`.
 */
import type { CreateMatchEventInput } from "@pitchside/validation";

import {
  statsV1KindToLogEventType,
  type StatsV1EventKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";

/** True when `playerId` can be sent to `POST /api/events` (CUID). */
export function isStatsPlayerIdPersistable(id: string | null | undefined): boolean {
  if (id == null || id.length < 20) return false;
  return /^c[a-z0-9]{20,}$/i.test(id);
}

function contextWithLog(
  event: StatsLoggedEvent,
  kind: StatsV1EventKind,
): NonNullable<CreateMatchEventInput["context"]> {
  return {
    logNormX: event.nx,
    logNormY: event.ny,
    logEventType: statsV1KindToLogEventType(kind),
  };
}

/**
 * Maps STATS-mode `StatsLoggedEvent` → API `CreateMatchEventInput` (minus `matchId`).
 */
export function statsLoggedEventToCreateInput(
  event: StatsLoggedEvent,
): Omit<CreateMatchEventInput, "matchId"> {
  switch (event.kind) {
    case "GOAL":
      return {
        type: "shot_goal",
        ...(isStatsPlayerIdPersistable(event.playerId)
          ? { playerId: event.playerId! }
          : {}),
        context: contextWithLog(event, "GOAL"),
      };
    case "POINT":
      return {
        type: "shot_point",
        ...(isStatsPlayerIdPersistable(event.playerId)
          ? { playerId: event.playerId! }
          : {}),
        context: contextWithLog(event, "POINT"),
      };
    case "TWO_POINT":
      return {
        type: "shot_two_pointer",
        ...(isStatsPlayerIdPersistable(event.playerId)
          ? { playerId: event.playerId! }
          : {}),
        context: contextWithLog(event, "TWO_POINT"),
      };
    case "WIDE":
      return {
        type: "shot_miss",
        context: contextWithLog(event, "WIDE"),
      };
    case "SHOT":
      return {
        type: "shot_miss",
        context: contextWithLog(event, "SHOT"),
      };
    case "FREE_WON":
      return {
        type: "foul_for",
        context: contextWithLog(event, "FREE_WON"),
      };
    case "FREE_CONCEDED":
      return {
        type: "foul_against",
        context: contextWithLog(event, "FREE_CONCEDED"),
      };
    case "TURNOVER_WON":
      return {
        type: "turnover_won",
        context: contextWithLog(event, "TURNOVER_WON"),
      };
    case "TURNOVER_LOST":
      return {
        type: "turnover_lost",
        context: contextWithLog(event, "TURNOVER_LOST"),
      };
    case "KICKOUT_WON":
      return {
        type: "kickout_won",
        context: contextWithLog(event, "KICKOUT_WON"),
      };
    case "KICKOUT_LOST":
      return {
        type: "kickout_lost",
        context: contextWithLog(event, "KICKOUT_LOST"),
      };
    default: {
      const _x: never = event.kind;
      return _x;
    }
  }
}
