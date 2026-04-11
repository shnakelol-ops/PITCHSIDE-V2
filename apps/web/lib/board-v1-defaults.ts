import type { BoardMarkerInput } from "@pitchside/validation";

import type { PitchSport } from "@/config/pitchConfig";

export type BoardMarkerState = BoardMarkerInput & { id: string };

/**
 * Gaelic football — landscape inner: x along pitch (0 = own/left goal, 1 = attack/right),
 * y across width (0 = top touchline, 1 = bottom).
 *
 * Default matches the **reference board layout** (same geometry as
 * `DEFAULT_SOCCER_TACTICS_FORMATION` in `soccer-pitch-tactics.tsx`): map reference
 * `nx` = width, `ny` = length with own goal at reference bottom → board
 * `x = 1 - ny`, `y = nx` so the spine, channels, and halfway-line cluster read the same
 * on the left/right Gaelic canvas.
 */
export const DEFAULT_BOARD_MARKER_GAELIC_SEED: readonly BoardMarkerInput[] = [
  { x: 0.06, y: 0.14, label: "1", teamSide: "HOME" },
  { x: 0.88, y: 0.18, label: "2", teamSide: "HOME" },
  { x: 0.5, y: 0.16, label: "3", teamSide: "HOME" },
  { x: 0.18, y: 0.22, label: "4", teamSide: "HOME" },
  { x: 0.89, y: 0.36, label: "5", teamSide: "HOME" },
  { x: 0.5, y: 0.34, label: "6", teamSide: "HOME" },
  { x: 0.17, y: 0.5, label: "7", teamSide: "HOME" },
  { x: 0.62, y: 0.5, label: "8", teamSide: "HOME" },
  { x: 0.39, y: 0.5, label: "9", teamSide: "HOME" },
  { x: 0.89, y: 0.64, label: "10", teamSide: "HOME" },
  { x: 0.5, y: 0.52, label: "11", teamSide: "HOME" },
  { x: 0.18, y: 0.78, label: "12", teamSide: "HOME" },
  { x: 0.87, y: 0.82, label: "13", teamSide: "HOME" },
  { x: 0.5, y: 0.68, label: "14", teamSide: "HOME" },
  { x: 0.16, y: 0.88, label: "15", teamSide: "HOME" },
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
