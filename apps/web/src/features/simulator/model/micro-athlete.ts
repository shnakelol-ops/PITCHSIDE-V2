/**
 * Micro-athlete domain model (simulator only). Positions use board-normalised
 * coordinates; heading is radians, 0 = +x (toward right goal), π/2 = +y down.
 */

export type MicroAthleteTeam = "home" | "away";

export type MicroAthleteJerseyStyle = {
  /** Main jersey body color (hex number, e.g. `0x1f9d7a`). */
  primaryColor?: number;
  /** Secondary panel / sleeve color. */
  secondaryColor?: number;
  /** Accent trim color (collar / edge treatments). */
  accentColor?: number;
  /** Optional explicit number color; auto-contrast fallback is applied when omitted. */
  numberColor?: number;
};

export type MicroAthleteInit = {
  id: string;
  nx: number;
  ny: number;
  /** Facing / intent direction (radians). */
  headingRad: number;
  team: MicroAthleteTeam;
  /** Tactical jersey number rendered on the token. */
  jerseyNumber?: number | string;
  /** Optional jersey color overrides. */
  jerseyStyle?: MicroAthleteJerseyStyle;
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
  jerseyNumber?: number | string;
  jerseyStyle?: MicroAthleteJerseyStyle;

  constructor(init: MicroAthleteInit) {
    this.id = init.id;
    this.nx = init.nx;
    this.ny = init.ny;
    this.headingRad = init.headingRad;
    this.team = init.team;
    this.jerseyNumber = init.jerseyNumber;
    this.jerseyStyle = init.jerseyStyle;
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
      jerseyNumber: 2,
      jerseyStyle: {
        primaryColor: 0x0f766e,
        secondaryColor: 0x99f6e4,
        accentColor: 0x134e4a,
      },
    }),
    new MicroAthlete({
      id: "ma-2",
      nx: 0.42,
      ny: 0.42,
      headingRad: Math.PI / 4,
      team: "home",
      jerseyNumber: 8,
      jerseyStyle: {
        primaryColor: 0x0f766e,
        secondaryColor: 0x99f6e4,
        accentColor: 0x115e59,
      },
    }),
    new MicroAthlete({
      id: "ma-3",
      nx: 0.55,
      ny: 0.52,
      headingRad: Math.PI / 2,
      team: "away",
      jerseyNumber: 10,
      jerseyStyle: {
        primaryColor: 0xb45309,
        secondaryColor: 0xffedd5,
        accentColor: 0x7c2d12,
      },
    }),
    new MicroAthlete({
      id: "ma-4",
      nx: 0.72,
      ny: 0.45,
      headingRad: -Math.PI / 3,
      team: "away",
      jerseyNumber: 15,
      jerseyStyle: {
        primaryColor: 0xb45309,
        secondaryColor: 0xffedd5,
        accentColor: 0x9a3412,
      },
    }),
  ];
}
