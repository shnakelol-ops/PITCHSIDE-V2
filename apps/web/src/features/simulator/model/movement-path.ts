import type { BoardNorm } from "@src/lib/pitch-coordinates";

/**
 * One sample on a movement path — board-normalised (same contract as micro-athletes).
 */
export type MovementPathPoint = BoardNorm;

/**
 * Recorded polyline for a single micro-athlete. Immutable from the outside when
 * returned from the store snapshot; internal recording mutates `points` array.
 */
export type MovementPath = {
  readonly id: string;
  readonly microAthleteId: string;
  /** Ordered from start → end of the recorded gesture. */
  points: MovementPathPoint[];
};

export function createMovementPath(microAthleteId: string): MovementPath {
  return {
    id: crypto.randomUUID(),
    microAthleteId,
    points: [],
  };
}
