/**
 * Single stats event model (Pitchside V1). All logging flows through this shape.
 * Coordinates: board-normalised nx, ny ∈ [0,1] — see `@src/lib/pitch-coordinates`.
 */

import { clamp01 } from "@src/lib/pitch-coordinates";

export type StatsPeriodPhase =
  | "unspecified"
  | "first_half"
  | "second_half"
  | "extra_time"
  | "half_time"
  | "full_time";

export type StatsFieldEventType =
  | "turnover_won"
  | "turnover_lost"
  | "kickout_won"
  | "kickout_lost"
  | "free_won"
  | "free_conceded"
  | "wide"
  | "shot";

export type StatsScoreType = "goal" | "point" | "two_point";

export type StatsTeamContext = "home" | "away" | "neutral";

export type StatsLoggedEventBase = {
  id: string;
  nx: number;
  ny: number;
  timestampMs: number;
  periodPhase: StatsPeriodPhase;
  scorerId: string | null;
  voiceNoteId: string | null;
  teamContext: StatsTeamContext | null;
};

export type StatsFieldLoggedEvent = StatsLoggedEventBase & {
  domain: "field";
  fieldType: StatsFieldEventType;
};

export type StatsScoreLoggedEvent = StatsLoggedEventBase & {
  domain: "score";
  scoreType: StatsScoreType;
};

export type StatsLoggedEvent = StatsFieldLoggedEvent | StatsScoreLoggedEvent;

export type StatsEventSelection =
  | { domain: "field"; fieldType: StatsFieldEventType }
  | { domain: "score"; scoreType: StatsScoreType };

export type CreateStatsLoggedEventInput = {
  selection: StatsEventSelection;
  nx: number;
  ny: number;
  timestampMs: number;
  /** When omitted, a UUID is generated in browser; tests should pass `id`. */
  id?: string;
  periodPhase?: StatsPeriodPhase;
  scorerId?: string | null;
  voiceNoteId?: string | null;
  teamContext?: StatsTeamContext | null;
};

function newStatsEventId(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `stats-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createStatsLoggedEvent(input: CreateStatsLoggedEventInput): StatsLoggedEvent {
  const nx = clamp01(input.nx);
  const ny = clamp01(input.ny);
  const base: StatsLoggedEventBase = {
    id: input.id ?? newStatsEventId(),
    nx,
    ny,
    timestampMs: input.timestampMs,
    periodPhase: input.periodPhase ?? "unspecified",
    scorerId: input.scorerId ?? null,
    voiceNoteId: input.voiceNoteId ?? null,
    teamContext: input.teamContext ?? null,
  };

  if (input.selection.domain === "field") {
    return {
      ...base,
      domain: "field",
      fieldType: input.selection.fieldType,
    };
  }

  return {
    ...base,
    domain: "score",
    scoreType: input.selection.scoreType,
  };
}
