import type { BoardMarkerInput } from "@pitchside/validation";

import type { PitchSport } from "@/config/pitchConfig";

export type BoardMarkerState = BoardMarkerInput & { id: string };

/**
 * Gaelic football — same normalisation as `PitchCanvas` Gaelic markings (`pitchConfig.ts`):
 * inner length 156 vb = 145 m → normalised **x** from own (left) goal = `metresFromLeft / 145`.
 * **y** is width across the pitch (0 top touchline, 1 bottom); board uses `left: x%`, `top: y%`.
 *
 * Vertical pitch lines in the renderer sit at `xAt(m/145)` → normalised **x = m/145** (identical
 * for all `m` measured from the left goal line). Halfway = 72.5 m → **x = 0.5**.
 *
 * GK: half the official small-rectangle depth (4.5 m) from the goal line — **2.25/145** on x, **y = 0.5**.
 * Each outfield triple: **y ∈ {1/6, 1/2, 5/6}** (even sixths, left / centre / right).
 * Midfield pair **8–9**: **x = 0.5**, **y = 1/3** and **2/3** (symmetric on halfway, not on wing sixths).
 */
const GAELIC_LEN_M = 145;
const gaelicXFromLeftGoalM = (m: number) => m / GAELIC_LEN_M;

const GAELIC_X_GK = (4.5 / 2) / GAELIC_LEN_M;
const GAELIC_X_OWN_20M = gaelicXFromLeftGoalM(20);
const GAELIC_X_OWN_45M = gaelicXFromLeftGoalM(45);
const GAELIC_X_MIDFIELD = gaelicXFromLeftGoalM(72.5);
const GAELIC_X_OPP_45M = gaelicXFromLeftGoalM(100);
const GAELIC_X_OPP_20M = gaelicXFromLeftGoalM(125);

const GAELIC_Y_LEFT = 1 / 6;
const GAELIC_Y_CENTRE = 1 / 2;
const GAELIC_Y_RIGHT = 5 / 6;
const GAELIC_Y_MID_A = 1 / 3;
const GAELIC_Y_MID_B = 2 / 3;

export const DEFAULT_BOARD_MARKER_GAELIC_SEED: readonly BoardMarkerInput[] = [
  { x: GAELIC_X_GK, y: GAELIC_Y_CENTRE, label: "1", teamSide: "HOME" },
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_LEFT, label: "2", teamSide: "HOME" },
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_CENTRE, label: "3", teamSide: "HOME" },
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_RIGHT, label: "4", teamSide: "HOME" },
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_LEFT, label: "5", teamSide: "HOME" },
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_CENTRE, label: "6", teamSide: "HOME" },
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_RIGHT, label: "7", teamSide: "HOME" },
  { x: GAELIC_X_MIDFIELD, y: GAELIC_Y_MID_A, label: "8", teamSide: "HOME" },
  { x: GAELIC_X_MIDFIELD, y: GAELIC_Y_MID_B, label: "9", teamSide: "HOME" },
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_LEFT, label: "10", teamSide: "HOME" },
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_CENTRE, label: "11", teamSide: "HOME" },
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_RIGHT, label: "12", teamSide: "HOME" },
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_LEFT, label: "13", teamSide: "HOME" },
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_CENTRE, label: "14", teamSide: "HOME" },
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_RIGHT, label: "15", teamSide: "HOME" },
];

/**
 * Soccer **4-4-2** — eleven players only (no 12–15 on default seed).
 * Authored in Gaelic-style visual frame (x = length, y = width), then stored as
 * `x = visual.y`, `y = visual.x` for `board-v1-panel` soccer display swap.
 */
const DEFAULT_BOARD_MARKER_SOCCER_GAELIC_VISUAL: readonly BoardMarkerInput[] = [
  { x: 0.085, y: 0.5, label: "1", teamSide: "HOME" },
  { x: 0.248, y: 0.18, label: "2", teamSide: "HOME" },
  { x: 0.248, y: 0.393, label: "3", teamSide: "HOME" },
  { x: 0.248, y: 0.607, label: "4", teamSide: "HOME" },
  { x: 0.248, y: 0.82, label: "5", teamSide: "HOME" },
  { x: 0.448, y: 0.18, label: "6", teamSide: "HOME" },
  { x: 0.448, y: 0.393, label: "7", teamSide: "HOME" },
  { x: 0.448, y: 0.607, label: "8", teamSide: "HOME" },
  { x: 0.448, y: 0.82, label: "9", teamSide: "HOME" },
  { x: 0.72, y: 0.38, label: "10", teamSide: "HOME" },
  { x: 0.72, y: 0.62, label: "11", teamSide: "HOME" },
];

export const DEFAULT_BOARD_MARKER_SEED: readonly BoardMarkerInput[] =
  DEFAULT_BOARD_MARKER_SOCCER_GAELIC_VISUAL.map(({ x, y, label, teamSide }) => ({
    x: y,
    y: x,
    label,
    teamSide,
  }));

/** Hurling — same default layout as Gaelic on the shared canvas. */
export const DEFAULT_BOARD_MARKER_HURLING_SEED = DEFAULT_BOARD_MARKER_GAELIC_SEED;

/** Normalised pitch coordinates: x,y in [0,1] from top-left of playing area. */
export function createDefaultBoardMarkers(
  sport: PitchSport = "soccer",
): BoardMarkerState[] {
  const seed =
    sport === "soccer"
      ? DEFAULT_BOARD_MARKER_SEED
      : DEFAULT_BOARD_MARKER_GAELIC_SEED;
  return seed.map((m) => ({
    ...m,
    id: crypto.randomUUID(),
  }));
}
