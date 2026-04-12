import { clamp01 } from "@src/lib/pitch-coordinates";

export type BoardNormPt = { nx: number; ny: number };

/**
 * Laplacian-style smoothing in board space for **display only** (store / playback unchanged).
 * Endpoints fixed; interior points eased to reduce hand-drawn jitter and sharp kinks.
 */
export function smoothBoardNormPolylineForDisplay(
  points: ReadonlyArray<BoardNormPt>,
  passes: number,
): BoardNormPt[] {
  if (points.length < 3 || passes < 1) {
    return points.map((p) => ({ nx: p.nx, ny: p.ny }));
  }
  let cur = points.map((p) => ({ nx: p.nx, ny: p.ny }));
  for (let pass = 0; pass < passes; pass++) {
    cur = cur.map((pt, i) => {
      if (i === 0 || i === cur.length - 1) {
        return { nx: pt.nx, ny: pt.ny };
      }
      const prev = cur[i - 1];
      const next = cur[i + 1];
      return {
        nx: clamp01(0.22 * prev.nx + 0.56 * pt.nx + 0.22 * next.nx),
        ny: clamp01(0.22 * prev.ny + 0.56 * pt.ny + 0.22 * next.ny),
      };
    });
  }
  return cur;
}

/** More passes when the gesture has many samples (still cheap at draw time). */
export function displaySmoothPasses(pointCount: number): number {
  if (pointCount < 4) return 0;
  if (pointCount < 10) return 2;
  if (pointCount < 24) return 3;
  if (pointCount < 48) return 4;
  return 5;
}
