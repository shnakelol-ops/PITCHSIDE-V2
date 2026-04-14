import { Graphics } from "pixi.js";

import type { MovementPath } from "@src/features/simulator/model/movement-path";
import {
  displaySmoothPasses,
  smoothBoardNormPolylineForDisplay,
} from "@src/features/simulator/pixi/path-display-smoothing";
import { traceWorldPolylineSmooth } from "@src/features/simulator/pixi/path-trace-smooth";
import { boardNormToWorld } from "@src/lib/pitch-coordinates";

function boardNormToWorldPts(
  points: ReadonlyArray<{ nx: number; ny: number }>,
): { x: number; y: number }[] {
  return points.map((p) => boardNormToWorld(p.nx, p.ny));
}

/**
 * Board-norm polylines → world-space strokes (display-smoothed only; store unchanged).
 * Tuned for premium baked turf: slightly deeper cut + calm broadcast core.
 */
export function drawMovementPathsGraphics(
  g: Graphics,
  paths: Iterable<MovementPath>,
): void {
  g.clear();
  const cutStroke = {
    width: 0.78,
    color: "rgba(3, 14, 10, 0.48)",
    cap: "round" as const,
    join: "round" as const,
    alignment: 0.5 as const,
  };
  const glowStroke = {
    width: 1.05,
    color: "rgba(220, 232, 236, 0.12)",
    cap: "round" as const,
    join: "round" as const,
    alignment: 0.5 as const,
  };
  const coreStroke = {
    width: 0.52,
    color: "rgba(242, 248, 244, 0.94)",
    cap: "round" as const,
    join: "round" as const,
    alignment: 0.5 as const,
  };

  for (const path of paths) {
    if (path.points.length < 2) continue;
    const passes = displaySmoothPasses(path.points.length);
    const drawPts =
      passes > 0
        ? smoothBoardNormPolylineForDisplay(path.points, passes)
        : path.points;
    const w = boardNormToWorldPts(drawPts);
    traceWorldPolylineSmooth(g, w);
    g.stroke(cutStroke);
    traceWorldPolylineSmooth(g, w);
    g.stroke(glowStroke);
    traceWorldPolylineSmooth(g, w);
    g.stroke(coreStroke);
  }
}
