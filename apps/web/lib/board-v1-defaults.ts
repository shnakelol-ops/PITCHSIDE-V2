import type { BoardMarkerInput } from "@pitchside/validation";

import type { PitchSport } from "@/config/pitchConfig";

export type BoardMarkerState = BoardMarkerInput & { id: string };

/**
 * Gaelic football — landscape inner: x along pitch (0 = own/left goal, 1 = attack/right),
 * y across width (0 = top touchline, 1 = bottom).
 *
 * Formation **1-3-3-2-3-3** (coach order):
 * 1 GK | 2–4 full backs | 5–7 half backs | 8–9 midfield | 10–12 half forwards | 13–15 full forwards.
 */
export const DEFAULT_BOARD_MARKER_GAELIC_SEED: readonly BoardMarkerInput[] = [
  { x: 0.085, y: 0.5, label: "1", teamSide: "HOME" },
  { x: 0.218, y: 0.182, label: "2", teamSide: "HOME" },
  { x: 0.218, y: 0.5, label: "3", teamSide: "HOME" },
  { x: 0.218, y: 0.818, label: "4", teamSide: "HOME" },
  { x: 0.368, y: 0.182, label: "5", teamSide: "HOME" },
  { x: 0.368, y: 0.5, label: "6", teamSide: "HOME" },
  { x: 0.368, y: 0.818, label: "7", teamSide: "HOME" },
  { x: 0.518, y: 0.428, label: "8", teamSide: "HOME" },
  { x: 0.518, y: 0.572, label: "9", teamSide: "HOME" },
  { x: 0.662, y: 0.182, label: "10", teamSide: "HOME" },
  { x: 0.662, y: 0.5, label: "11", teamSide: "HOME" },
  { x: 0.662, y: 0.818, label: "12", teamSide: "HOME" },
  { x: 0.818, y: 0.182, label: "13", teamSide: "HOME" },
  { x: 0.818, y: 0.5, label: "14", teamSide: "HOME" },
  { x: 0.818, y: 0.818, label: "15", teamSide: "HOME" },
];

/**
 * Soccer **4-4-2** authored in the same Gaelic-style visual frame (x = length, y = width), then
 * mapped to stored board space: `stored.x = visual.y`, `stored.y = visual.x` so the live board
 * (`left = y`, `top = x`) matches that shape with L/R goals unchanged.
 *
 * 1 GK | 2–5 back four | 6–9 midfield four | 10–11 forwards | 12–15 interchange strip (own top).
 */
const DEFAULT_BOARD_MARKER_SOCCER_GAELIC_VISUAL: readonly BoardMarkerInput[] = [
  { x: 0.085, y: 0.5, label: "1", teamSide: "HOME" },
  { x: 0.245, y: 0.18, label: "2", teamSide: "HOME" },
  { x: 0.245, y: 0.393, label: "3", teamSide: "HOME" },
  { x: 0.245, y: 0.607, label: "4", teamSide: "HOME" },
  { x: 0.245, y: 0.82, label: "5", teamSide: "HOME" },
  { x: 0.435, y: 0.18, label: "6", teamSide: "HOME" },
  { x: 0.435, y: 0.393, label: "7", teamSide: "HOME" },
  { x: 0.435, y: 0.607, label: "8", teamSide: "HOME" },
  { x: 0.435, y: 0.82, label: "9", teamSide: "HOME" },
  { x: 0.695, y: 0.375, label: "10", teamSide: "HOME" },
  { x: 0.695, y: 0.625, label: "11", teamSide: "HOME" },
  { x: 0.3, y: 0.095, label: "12", teamSide: "HOME" },
  { x: 0.43, y: 0.095, label: "13", teamSide: "HOME" },
  { x: 0.57, y: 0.095, label: "14", teamSide: "HOME" },
  { x: 0.7, y: 0.095, label: "15", teamSide: "HOME" },
];

export const DEFAULT_BOARD_MARKER_SEED: readonly BoardMarkerInput[] =
  DEFAULT_BOARD_MARKER_SOCCER_GAELIC_VISUAL.map(({ x, y, label, teamSide }) => ({
    x: y,
    y: x,
    label,
    teamSide,
  }));

/** Hurling — same default layout and spacing as Gaelic on the shared canvas. */
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
