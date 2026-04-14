import type { BoardNorm } from "@src/lib/pitch-coordinates";

export type ShadowRunPoint = BoardNorm;

/**
 * Secondary teaching path for one micro-athlete. Stored separately from the main
 * `MovementPath`; uses the same board-normalised coordinate contract.
 */
export type ShadowRun = {
  readonly id: string;
  readonly microAthleteId: string;
  /** Main path id at record time; updated when the athlete records a new main path. */
  mainPathId: string | null;
  points: ShadowRunPoint[];
};

export function createShadowRun(
  microAthleteId: string,
  mainPathId: string | null,
): ShadowRun {
  return {
    id: crypto.randomUUID(),
    microAthleteId,
    mainPathId,
    points: [],
  };
}
