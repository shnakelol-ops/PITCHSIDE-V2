import type { BoardMarkerState } from "@/lib/board-v1-defaults";

function r(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

type DrawingCompare = {
  kind: "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** Stable string for comparing board content (ignores transient client ids). */
export function boardContentSnapshot(
  markers: BoardMarkerState[],
  drawings: DrawingCompare[],
): string {
  const m = [...markers]
    .map(({ x, y, label, teamSide }) => ({
      x: r(x),
      y: r(y),
      label,
      teamSide,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const d = [...drawings]
    .map(({ kind, x1, y1, x2, y2 }) => ({
      kind,
      x1: r(x1),
      y1: r(y1),
      x2: r(x2),
      y2: r(y2),
    }))
    .sort((a, b) =>
      a.x1 !== b.x1 ? a.x1 - b.x1 : a.y1 !== b.y1 ? a.y1 - b.y1 : a.x2 - b.x2,
    );

  return JSON.stringify({ m, d });
}
