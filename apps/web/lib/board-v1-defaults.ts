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
 * Lines of three use **y**: team **right** = high y (`GAELIC_Y_RIGHT`), **centre**, **left** = low y
 * (own goal left, attack to the right). Midfield **8–9** sit on halfway with a vertical split.
 *
 * Labels: 1 GK · 2–4 full backs · 5–7 half backs · 8–9 midfield · 10–12 half forwards · 13–15 full forwards.
 */
const GAELIC_LEN_M = 145;
const gaelicXFromLeftGoalM = (m: number) => m / GAELIC_LEN_M;

const GAELIC_X_GK = (4.5 / 2) / GAELIC_LEN_M;
const GAELIC_X_OWN_20M = gaelicXFromLeftGoalM(20);
const GAELIC_X_OWN_45M = gaelicXFromLeftGoalM(45);
const GAELIC_X_MIDFIELD = gaelicXFromLeftGoalM(72.5);
const GAELIC_X_OPP_45M = gaelicXFromLeftGoalM(100);
const GAELIC_X_OPP_20M = gaelicXFromLeftGoalM(125);

const GAELIC_Y_LEFT = 0.18;
const GAELIC_Y_CENTRE = 1 / 2;
const GAELIC_Y_RIGHT = 0.82;
const GAELIC_Y_MID_A = 0.34;
const GAELIC_Y_MID_B = 0.66;

export const DEFAULT_BOARD_MARKER_GAELIC_SEED: readonly BoardMarkerInput[] = [
  /* 1 — goalkeeper */
  { x: GAELIC_X_GK, y: GAELIC_Y_CENTRE, label: "1", teamSide: "HOME" },
  /* 2–4 — right / centre / left full back (own 20 m) */
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_RIGHT, label: "2", teamSide: "HOME" },
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_CENTRE, label: "3", teamSide: "HOME" },
  { x: GAELIC_X_OWN_20M, y: GAELIC_Y_LEFT, label: "4", teamSide: "HOME" },
  /* 5–7 — right / centre / left half back (own 45 m) */
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_RIGHT, label: "5", teamSide: "HOME" },
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_CENTRE, label: "6", teamSide: "HOME" },
  { x: GAELIC_X_OWN_45M, y: GAELIC_Y_LEFT, label: "7", teamSide: "HOME" },
  /* 8–9 — midfield (halfway) */
  { x: GAELIC_X_MIDFIELD, y: GAELIC_Y_MID_A, label: "8", teamSide: "HOME" },
  { x: GAELIC_X_MIDFIELD, y: GAELIC_Y_MID_B, label: "9", teamSide: "HOME" },
  /* 10–12 — right / centre / left half forward (opp 45 m) */
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_RIGHT, label: "10", teamSide: "HOME" },
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_CENTRE, label: "11", teamSide: "HOME" },
  { x: GAELIC_X_OPP_45M, y: GAELIC_Y_LEFT, label: "12", teamSide: "HOME" },
  /* 13–15 — right / centre / left full forward (opp 20 m) */
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_RIGHT, label: "13", teamSide: "HOME" },
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_CENTRE, label: "14", teamSide: "HOME" },
  { x: GAELIC_X_OPP_20M, y: GAELIC_Y_LEFT, label: "15", teamSide: "HOME" },
];

/**
 * Soccer **4-4-2** — eleven players. **x** = toward opposition goal (0 own line), **y** = width
 * (0 top touchline). Hand-tuned to sit just outside the penalty box band, clear of centre spot,
 * with a balanced bank of four and two forwards — visual-first, not metre-perfect.
 */
export const DEFAULT_BOARD_MARKER_SOCCER_SEED: readonly BoardMarkerInput[] = [
  { x: 0.045, y: 0.5, label: "1", teamSide: "HOME" },
  { x: 0.18, y: 0.14, label: "2", teamSide: "HOME" },
  { x: 0.18, y: 0.36, label: "3", teamSide: "HOME" },
  { x: 0.18, y: 0.64, label: "4", teamSide: "HOME" },
  { x: 0.18, y: 0.86, label: "5", teamSide: "HOME" },
  { x: 0.4, y: 0.14, label: "6", teamSide: "HOME" },
  { x: 0.4, y: 0.36, label: "7", teamSide: "HOME" },
  { x: 0.4, y: 0.64, label: "8", teamSide: "HOME" },
  { x: 0.4, y: 0.86, label: "9", teamSide: "HOME" },
  { x: 0.7, y: 0.4, label: "10", teamSide: "HOME" },
  { x: 0.7, y: 0.6, label: "11", teamSide: "HOME" },
];

/** Alias for server playbook bootstrap (`/api/matches/.../board`); same coordinates as soccer seed. */
export const DEFAULT_BOARD_MARKER_SEED = DEFAULT_BOARD_MARKER_SOCCER_SEED;

/** Hurling — copy of Gaelic default layout on the shared canvas. */
export const DEFAULT_BOARD_MARKER_HURLING_SEED = DEFAULT_BOARD_MARKER_GAELIC_SEED;

/** Normalised pitch coordinates: x,y in [0,1] from top-left of playing area. */
export function createDefaultBoardMarkers(
  sport: PitchSport = "soccer",
): BoardMarkerState[] {
  const seed =
    sport === "soccer"
      ? DEFAULT_BOARD_MARKER_SOCCER_SEED
      : DEFAULT_BOARD_MARKER_HURLING_SEED;
  return seed.map((m) => ({
    ...m,
    id: crypto.randomUUID(),
  }));
}
