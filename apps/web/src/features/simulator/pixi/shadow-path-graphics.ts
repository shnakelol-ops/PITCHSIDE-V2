import { Graphics } from "pixi.js";

import type { ShadowRun } from "@src/features/simulator/model/shadow-run";
import {
  displaySmoothPasses,
  smoothBoardNormPolylineForDisplay,
} from "@src/features/simulator/pixi/path-display-smoothing";
import {
  densifyWorldPolyline,
  traceWorldPolylineSmooth,
} from "@src/features/simulator/pixi/path-trace-smooth";
import { boardNormToWorld } from "@src/lib/pitch-coordinates";

type WorldPt = { x: number; y: number };

const DASH_DENSIFY = 0.48;

function boardRunToWorldPts(run: ShadowRun): WorldPt[] {
  const passes = displaySmoothPasses(run.points.length);
  const pts =
    passes > 0
      ? smoothBoardNormPolylineForDisplay(run.points, passes)
      : run.points;
  return pts.map((p) => boardNormToWorld(p.nx, p.ny));
}

/** Restrained underlay so dashed shadow lines read on turf without competing with main paths. */
function strokeShadowPathUnderlay(g: Graphics, pts: WorldPt[]): void {
  if (pts.length < 2) return;
  traceWorldPolylineSmooth(g, pts);
  g.stroke({
    width: 0.68,
    color: "rgba(110, 118, 200, 0.055)",
    cap: "round",
    join: "round",
    alignment: 0.5,
  });
}

/**
 * Stroke a polyline in world space with a fixed dash/gap pattern along arc length.
 */
function interpolateAtDistance(
  segs: { ax: number; ay: number; bx: number; by: number; len: number }[],
  dist: number,
): WorldPt | null {
  if (segs.length === 0) return null;
  if (dist <= 0) return { x: segs[0].ax, y: segs[0].ay };
  let d = 0;
  for (const s of segs) {
    if (d + s.len >= dist - 1e-9) {
      const u = Math.max(0, Math.min(1, (dist - d) / s.len));
      return {
        x: s.ax + (s.bx - s.ax) * u,
        y: s.ay + (s.by - s.ay) * u,
      };
    }
    d += s.len;
  }
  const last = segs[segs.length - 1];
  return { x: last.bx, y: last.by };
}

function strokeDashedWorldPolyline(
  g: Graphics,
  pts: WorldPt[],
  dash: number,
  gap: number,
): void {
  if (pts.length < 2) return;
  const segs: { ax: number; ay: number; bx: number; by: number; len: number }[] =
    [];
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x;
    const ay = pts[i - 1].y;
    const bx = pts[i].x;
    const by = pts[i].y;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    segs.push({ ax, ay, bx, by, len });
  }
  const total = segs.reduce((s, z) => s + z.len, 0);
  if (total < 1e-9) return;

  const pattern = dash + gap;
  const strokeOpts = {
    width: 0.3,
    color: "rgba(178, 190, 228, 0.3)",
    cap: "round" as const,
    join: "round" as const,
    alignment: 0.5 as const,
  };

  let d = 0;
  let drewDash = false;
  /** Guard + monotonic advance: at large `d`, `d + tinyChunk` can round to `d` and hang forever. */
  const maxIter = Math.min(500_000, Math.ceil(total / pattern) + segs.length * 8 + 64);
  for (let iter = 0; iter < maxIter && d < total - 1e-6; iter++) {
    const phase = d % pattern;
    const inDash = phase < dash;
    const toPatternEnd = (inDash ? dash : pattern) - phase;
    const chunk = Math.min(toPatternEnd, total - d);
    if (!Number.isFinite(chunk) || chunk < 1e-12) {
      break;
    }
    if (inDash && chunk > 1e-6) {
      const p0 = interpolateAtDistance(segs, d);
      const p1 = interpolateAtDistance(segs, d + chunk);
      if (p0 && p1) {
        g.moveTo(p0.x, p0.y);
        g.lineTo(p1.x, p1.y);
        drewDash = true;
      }
    }
    const nextD = d + chunk;
    if (!(nextD > d)) {
      break;
    }
    d = nextD;
  }
  if (drewDash) {
    g.stroke(strokeOpts);
  }
}

/**
 * Ghosted dashed polylines for secondary teaching movement (main paths stay solid).
 */
export function drawShadowRunsGraphics(
  g: Graphics,
  runs: Iterable<ShadowRun>,
): void {
  g.clear();
  for (const run of runs) {
    if (run.points.length < 2) continue;
    const wpts = densifyWorldPolyline(boardRunToWorldPts(run), DASH_DENSIFY);
    strokeShadowPathUnderlay(g, wpts);
    strokeDashedWorldPolyline(g, wpts, 1.52, 1.12);
  }
}
