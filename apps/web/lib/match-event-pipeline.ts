import type { MatchPeriod } from "@pitchside/data-access";
import type { CreateMatchEventInput } from "@pitchside/validation";

import {
  thirdLaneToApiPitch,
  type BoardPitchLane,
  type BoardPitchSide,
  type BoardPitchThird,
} from "@/lib/board-log-tap";

/** Board-armed tap fields merged into event `context` (matches live workspace pending pick). */
export type MatchEventBoardPendingInput = {
  x: number;
  y: number;
  zone: string;
  third: BoardPitchThird;
  lane: BoardPitchLane;
  side: BoardPitchSide;
};

/**
 * Sidebar / dashboard fragment for `context` on `POST /api/events` (clock + optional board tap).
 * Provider `buildMatchEventPostBody` still merges match period and final clock rules on send.
 */
export function buildMatchEventLogContext(params: {
  clockLabel: string;
  pendingBoardLogContext: MatchEventBoardPendingInput | null;
}): NonNullable<CreateMatchEventInput["context"]> {
  const ctx: NonNullable<CreateMatchEventInput["context"]> = {
    clockLabel: params.clockLabel,
  };
  const arm = params.pendingBoardLogContext;
  if (arm) {
    ctx.logNormX = arm.x;
    ctx.logNormY = arm.y;
    ctx.logDerivedZone = arm.zone;
    const { pitchZone, pitchLane } = thirdLaneToApiPitch(arm.third, arm.lane);
    ctx.pitchZone = pitchZone;
    ctx.pitchLane = pitchLane;
    if (arm.side === "own" || arm.side === "opp" || arm.side === "neutral") {
      ctx.pitchSide = arm.side;
    }
  }
  return ctx;
}

/**
 * Single canonical builder for `POST /api/events` payloads from the match workspace.
 *
 * All logging UIs must call `MatchWorkspaceLiveProvider.postMatchEvent()` only;
 * that hook uses this function so classic “Event actions” and Event-first share
 * identical context merge rules (clock label, match clock period snapshot, etc.).
 */
export function buildMatchEventPostBody(
  matchId: string,
  matchClockPeriod: MatchPeriod,
  clockLabelFromRef: string,
  input: Omit<CreateMatchEventInput, "matchId">,
): CreateMatchEventInput {
  const clockLabel =
    input.context?.clockLabel?.trim() || clockLabelFromRef;

  const mergedContext = {
    ...(input.context ?? {}),
    clockLabel,
    matchPeriod: input.context?.matchPeriod ?? matchClockPeriod,
  };

  return {
    matchId,
    type: input.type,
    ...(input.playerId ? { playerId: input.playerId } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    context: mergedContext,
  };
}
