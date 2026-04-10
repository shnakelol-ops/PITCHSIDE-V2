import type { BoardMarkerInput } from "@pitchside/validation";

export type BoardMarkerState = BoardMarkerInput & { id: string };

/** Seed rows for DB insert (no ids). Same geometry as default client markers. */
export const DEFAULT_BOARD_MARKER_SEED: readonly BoardMarkerInput[] = [
  { x: 0.5, y: 0.88, label: "1", teamSide: "HOME" },
  { x: 0.22, y: 0.72, label: "2", teamSide: "HOME" },
  { x: 0.38, y: 0.7, label: "3", teamSide: "HOME" },
  { x: 0.5, y: 0.68, label: "4", teamSide: "HOME" },
  { x: 0.62, y: 0.7, label: "5", teamSide: "HOME" },
  { x: 0.78, y: 0.72, label: "6", teamSide: "HOME" },
  { x: 0.18, y: 0.52, label: "7", teamSide: "HOME" },
  { x: 0.35, y: 0.48, label: "8", teamSide: "HOME" },
  { x: 0.5, y: 0.45, label: "9", teamSide: "HOME" },
  { x: 0.65, y: 0.48, label: "10", teamSide: "HOME" },
  { x: 0.82, y: 0.52, label: "11", teamSide: "HOME" },
  { x: 0.3, y: 0.32, label: "12", teamSide: "HOME" },
  { x: 0.5, y: 0.28, label: "13", teamSide: "HOME" },
  { x: 0.7, y: 0.32, label: "14", teamSide: "HOME" },
  { x: 0.5, y: 0.14, label: "15", teamSide: "HOME" },
];

/** Normalised pitch coordinates: x,y in [0,1] from top-left of playing area. */
export function createDefaultBoardMarkers(): BoardMarkerState[] {
  return DEFAULT_BOARD_MARKER_SEED.map((m) => ({
    ...m,
    id: crypto.randomUUID(),
  }));
}
