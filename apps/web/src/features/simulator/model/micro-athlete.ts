/**
 * Micro-athlete domain model (simulator only). Positions use board-normalised
 * coordinates; heading is radians, 0 = +x (toward right goal), π/2 = +y down.
 */

export type MicroAthleteTeam = "home" | "away";

export type MicroAthleteInit = {
  id: string;
  nx: number;
  ny: number;
  /** Facing / intent direction (radians). */
  headingRad: number;
  team: MicroAthleteTeam;
};

/**
 * Single source of truth for simulator player state.
 * Keep this model mutable because drag + playback update it per-frame.
 */
export class MicroAthlete {
  id: string;
  nx: number;
  ny: number;
  /** Facing / intent direction (radians). */
  headingRad: number;
  team: MicroAthleteTeam;

  constructor(init: MicroAthleteInit) {
    this.id = init.id;
    this.nx = init.nx;
    this.ny = init.ny;
    this.headingRad = init.headingRad;
    this.team = init.team;
  }
}

/** Body radius in pitch world units (160×100 space). */
export const MICRO_ATHLETE_RADIUS_WORLD = 2.15;

/**
 * Hit target intentionally generous (>= 2x the visible body radius) so drag
 * initiation stays easy on touch devices.
 */
export const MICRO_ATHLETE_HIT_RADIUS_WORLD = 4.8;

export function createDefaultMicroAthletes(): MicroAthlete[] {
  return [
    new MicroAthlete({
      id: "ma-1",
      nx: 0.28,
      ny: 0.48,
      headingRad: 0,
      team: "home",
    }),
    new MicroAthlete({
      id: "ma-2",
      nx: 0.42,
      ny: 0.42,
      headingRad: Math.PI / 4,
      team: "home",
    }),
    new MicroAthlete({
      id: "ma-3",
      nx: 0.55,
      ny: 0.52,
      headingRad: Math.PI / 2,
      team: "away",
    }),
    new MicroAthlete({
      id: "ma-4",
      nx: 0.72,
      ny: 0.45,
      headingRad: -Math.PI / 3,
      team: "away",
    }),
  ];
}
