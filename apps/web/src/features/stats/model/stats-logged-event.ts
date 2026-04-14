/**
 * V1 STATS pitch log: one shape, board-normalised nx, ny ∈ [0, 1].
 * UI may show ×100; persistence uses the same 0–1 values in `context.logNormX` / `logNormY`.
 */

import { clamp01 } from "@src/lib/pitch-coordinates";

import type { StatsV1EventKind } from "@src/features/stats/model/stats-v1-event-kind";

export type StatsPeriodPhase =
  | "unspecified"
  | "first_half"
  | "second_half"
  | "extra_time"
  | "half_time"
  | "full_time";

export type StatsTeamContext = "home" | "away" | "neutral";

export type StatsLoggedEvent = {
  id: string;
  kind: StatsV1EventKind;
  nx: number;
  ny: number;
  timestampMs: number;
  periodPhase: StatsPeriodPhase;
  /** Scorer / attributee when `kind` is a score kind; optional. */
  playerId: string | null;
  voiceNoteId: string | null;
  teamContext: StatsTeamContext | null;
};

export type CreateStatsLoggedEventInput = {
  kind: StatsV1EventKind;
  nx: number;
  ny: number;
  timestampMs: number;
  /** When omitted, a UUID is generated in browser; tests should pass `id`. */
  id?: string;
  periodPhase?: StatsPeriodPhase;
  playerId?: string | null;
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

export function createStatsLoggedEvent(
  input: CreateStatsLoggedEventInput,
): StatsLoggedEvent {
  const nx = clamp01(input.nx);
  const ny = clamp01(input.ny);
  return {
    id: input.id ?? newStatsEventId(),
    kind: input.kind,
    nx,
    ny,
    timestampMs: input.timestampMs,
    periodPhase: input.periodPhase ?? "unspecified",
    playerId: input.playerId ?? null,
    voiceNoteId: input.voiceNoteId ?? null,
    teamContext: input.teamContext ?? null,
  };
}
