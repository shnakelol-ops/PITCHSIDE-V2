/**
 * Micro-athlete domain model (simulator only). Positions use board-normalised
 * coordinates; heading is radians, 0 = +x (toward right goal), π/2 = +y down.
 */

export type MicroAthleteTeam = "home" | "away";

export type MicroAthlete = {
  id: string;
  /** Short on-pitch label rendered above the athlete token. */
  label?: string;
  nx: number;
  ny: number;
  /** Facing / intent direction (radians). */
  headingRad: number;
  team: MicroAthleteTeam;
};

/** Body radius in pitch world units (160×100 space). */
export const MICRO_ATHLETE_RADIUS_WORLD = 2.15;

/** Hit target slightly larger than visual — tuned for phone/tablet coaching taps. */
export const MICRO_ATHLETE_HIT_RADIUS_WORLD = 3.25;

export function createDefaultMicroAthletes(): MicroAthlete[] {
  return [
    {
      id: "ma-1",
      label: "A O'Neil",
      nx: 0.28,
      ny: 0.48,
      headingRad: 0,
      team: "home",
    },
    {
      id: "ma-2",
      label: "C Byrne",
      nx: 0.42,
      ny: 0.42,
      headingRad: Math.PI / 4,
      team: "home",
    },
    {
      id: "ma-3",
      label: "M Walsh",
      nx: 0.55,
      ny: 0.52,
      headingRad: Math.PI / 2,
      team: "away",
    },
    {
      id: "ma-4",
      label: "R Kelly",
      nx: 0.72,
      ny: 0.45,
      headingRad: -Math.PI / 3,
      team: "away",
    },
  ];
}
