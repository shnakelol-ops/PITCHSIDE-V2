import type { BoardMarkerInput } from "@pitchside/validation";

import type { PitchSport } from "@/config/pitchConfig";

export type BoardMarkerState = BoardMarkerInput & { id: string };

/**
 * Gaelic football — landscape inner: x along pitch (0 = own/left goal, 1 = attack/right),
 * y across width (0 = top touchline, 1 = bottom). **y = left→right** on the grass.
 *
 * Rows are anchored to pitch lines (145 m length → normalised x = m/145 on inner length):
 * own 20 m, own 45 m, halfway, opposition 45 m, opposition 20 m. GK just inside own goal.
 *
 * Channel rule (jersey L→R on each line): 4–3–2, 7–6–5, 8–9, 12–11–10, 15–14–13 — from
 * swapping outer pairs (2↔4, 5↔7, 10↔12, 13↔15) on an otherwise symmetric spine (3,6,11,14; 8–9).
 */
const GAELIC_X_OWN_20M = 20 / 145;
const GAELIC_X_OWN_45M = 45 / 145;
const GAELIC_X_MIDFIELD = 0.5;
const GAELIC_X_OPP_45M = 100 / 145;
const GAELIC_X_OPP_20M = 125 / 145;
const GAELIC_X_GOALKEEPER = 0.058;
const GAELIC_Y_LEFT = 0.18;
const GAELIC_Y_CENTRE = 0.5;
const GAELIC_Y_RIGHT = 0.82;
const GAELIC_Y_MID_LO = 0.22;
const GAELIC_Y_MID_HI = 0.78;

export const DEFAULT_BOARD_MARKER_GAELIC_SEED: readonly BoardMarkerInput[] = [
  { x: GAELIC_X_GOALKEEPER, y: GAELIC_Y_CENTRE, label: "1", teamSide: "HOME" },
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_RIGHT, label: "2", teamSide: "HOME" },
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_CENTRE, label: "3", teamSide: "HOME" },
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_LEFT, label: "4", teamSide: "HOME" },
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_RIGHT, label: "5", teamSide: "HOME" },
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_CENTRE, label: "6", teamSide: "HOME" },
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_LEFT, label: "7", teamSide: "HOME" },
  { x: GAELIC_X_MIDFIELD, y: GAELIC_Y_MID_LO, label: "8", teamSide: "HOME" },
  { x: GAELIC_X_MIDFIELD, y: GAELIC_Y_MID_HI, label: "9", teamSide: "HOME" },
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_RIGHT, label: "10", teamSide: "HOME" },
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_CENTRE, label: "11", teamSide: "HOME" },
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_LEFT, label: "12", teamSide: "HOME" },
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_RIGHT, label: "13", teamSide: "HOME" },
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_CENTRE, label: "14", teamSide: "HOME" },
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_LEFT, label: "15", teamSide: "HOME" },
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
