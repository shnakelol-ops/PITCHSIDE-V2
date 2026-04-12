import type { Graphics } from "pixi.js";

/**
 * World-space polyline as quadratic segments (display-only; reads smoother than raw segments).
 */
export function traceWorldPolylineSmooth(
  g: Graphics,
  pts: ReadonlyArray<{ x: number; y: number }>,
): void {
  const n = pts.length;
  if (n < 2) return;
  if (n === 2) {
    g.moveTo(pts[0].x, pts[0].y);
    g.lineTo(pts[1].x, pts[1].y);
    return;
  }
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < n - 2; i++) {
    const p = pts[i];
    const nx = (p.x + pts[i + 1].x) * 0.5;
    const ny = (p.y + pts[i + 1].y) * 0.5;
    g.quadraticCurveTo(p.x, p.y, nx, ny);
  }
  const pN2 = pts[n - 2];
  const pN1 = pts[n - 1];
  g.quadraticCurveTo(pN2.x, pN2.y, pN1.x, pN1.y);
}

/** Insert points so no segment exceeds `maxLen` (world units) — stabilises dashes on smooth curves. */
export function densifyWorldPolyline(
  pts: ReadonlyArray<{ x: number; y: number }>,
  maxLen: number,
): { x: number; y: number }[] {
  if (pts.length < 2) return pts.map((p) => ({ x: p.x, y: p.y }));
  const out: { x: number; y: number }[] = [{ x: pts[0].x, y: pts[0].y }];
  for (let i = 1; i < pts.length; i++) {
    const a = out[out.length - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-9) continue;
    const steps = Math.min(48, Math.max(1, Math.ceil(d / maxLen)));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push({ x: a.x + dx * t, y: a.y + dy * t });
    }
  }
  return out;
}
