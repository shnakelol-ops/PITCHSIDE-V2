import { SportType } from "@pitchside/data-access";
import type { MatchEventType } from "@pitchside/validation";

import type { LoggedEventRow } from "@/lib/match-events";

export type LiveDerivedStats = {
  goals: number;
  points: number;
  twoPointers: number;
  scoreTotal: number;
  shotMisses: number;
  shotsTotal: number;
  unforcedErrors: number;
  turnoversWon: number;
  turnoversLost: number;
  unforcedTurnovers: number;
  foulsWon: number;
  foulsConceded: number;
  kickoutsWon: number;
  kickoutsLost: number;
};

export function usesGaelicScoring(sport: SportType): boolean {
  return (
    sport === SportType.GAELIC_FOOTBALL || sport === SportType.HURLING
  );
}

function countType(events: LoggedEventRow[], t: MatchEventType): number {
  return events.filter((e) => e.type === t).length;
}

export function deriveLiveStats(
  events: LoggedEventRow[],
  sport: SportType,
): LiveDerivedStats {
  const goals = countType(events, "shot_goal");
  const points = countType(events, "shot_point");
  const twoPointers = countType(events, "shot_two_pointer");
  const shotMisses = countType(events, "shot_miss");
  const unforcedErrors = countType(events, "unforced_error");
  const shotsTotal = goals + points + twoPointers + shotMisses;
  const gaelic = usesGaelicScoring(sport);
  const scoreTotal = gaelic
    ? goals * 3 + points
    : goals * 3 + points + twoPointers * 2;

  return {
    goals,
    points,
    twoPointers,
    scoreTotal,
    shotMisses,
    shotsTotal,
    unforcedErrors,
    turnoversWon: countType(events, "turnover_won"),
    turnoversLost: countType(events, "turnover_lost"),
    unforcedTurnovers: countType(events, "unforced_turnover"),
    foulsWon: countType(events, "foul_for"),
    foulsConceded: countType(events, "foul_against"),
    kickoutsWon: countType(events, "kickout_won"),
    kickoutsLost: countType(events, "kickout_lost"),
  };
}
