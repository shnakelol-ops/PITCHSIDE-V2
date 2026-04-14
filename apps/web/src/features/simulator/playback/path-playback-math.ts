import { clamp01 } from "@src/lib/pitch-coordinates";

export type PathSamplePoint = { nx: number; ny: number };

/** Euclidean length in board-normalised space (same scale as on-pitch distances). */
export function pathPolylineArcLength(
  points: ReadonlyArray<PathSamplePoint>,
): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].nx - points[i - 1].nx;
    const dy = points[i].ny - points[i - 1].ny;
    sum += Math.hypot(dx, dy);
  }
  return sum;
}

/** Duration scales with path length; clamp so very short paths are still visible. */
export function durationMsForPath(
  points: ReadonlyArray<PathSamplePoint>,
): number {
  const len = pathPolylineArcLength(points);
  return Math.max(2000, Math.round(3800 * len));
}

/**
 * Sample position along the polyline at t01 ∈ [0, 1] by arc-length.
 * Heading matches the current segment direction (radians, board space).
 */
export function sampleMovementPathAtProgress(
  points: ReadonlyArray<PathSamplePoint>,
  t01: number,
): { nx: number; ny: number; headingRad: number } | null {
  if (points.length === 0) return null;
  const t = clamp01(t01);

  if (points.length === 1) {
    return {
      nx: points[0].nx,
      ny: points[0].ny,
      headingRad: 0,
    };
  }

  const total = pathPolylineArcLength(points);
  if (total <= 1e-12) {
    return {
      nx: points[0].nx,
      ny: points[0].ny,
      headingRad: Math.atan2(
        points[1].ny - points[0].ny,
        points[1].nx - points[0].nx,
      ),
    };
  }

  const targetDist = t * total;
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dx = p1.nx - p0.nx;
    const dy = p1.ny - p0.ny;
    const seg = Math.hypot(dx, dy);
    const heading = Math.atan2(dy, dx);
    if (seg <= 1e-12) continue;
    if (acc + seg >= targetDist - 1e-9) {
      const u = Math.min(1, Math.max(0, (targetDist - acc) / seg));
      return {
        nx: p0.nx + dx * u,
        ny: p0.ny + dy * u,
        headingRad: heading,
      };
    }
    acc += seg;
  }

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return {
    nx: last.nx,
    ny: last.ny,
    headingRad: Math.atan2(last.ny - prev.ny, last.nx - prev.nx),
  };
}
