/**
 * Shortest-arc linear blend in radians (stable for headings / playback smoothing).
 */
export function shortestAngleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function lerpShortestAngle(from: number, to: number, t: number): number {
  return from + shortestAngleDelta(from, to) * t;
}

/**
 * Frame-rate independent exponential smoothing toward a target angle.
 * `smoothing` is roughly “snappiness” per second (higher = faster).
 */
export function smoothAngleToward(
  current: number | undefined,
  target: number,
  deltaMs: number,
  smoothingPerSecond: number,
): number {
  if (current === undefined || deltaMs <= 0) return target;
  const k = smoothingPerSecond;
  const t = 1 - Math.exp((-k * deltaMs) / 1000);
  return lerpShortestAngle(current, target, Math.min(1, t));
}
