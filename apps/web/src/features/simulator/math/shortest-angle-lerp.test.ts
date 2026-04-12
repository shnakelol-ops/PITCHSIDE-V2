import { describe, expect, it } from "vitest";

import {
  lerpShortestAngle,
  shortestAngleDelta,
  smoothAngleToward,
} from "@src/features/simulator/math/shortest-angle-lerp";

describe("shortest-angle-lerp", () => {
  it("shortestAngleDelta is bounded and magnitude matches shortest arc", () => {
    expect(shortestAngleDelta(0, Math.PI)).toBeCloseTo(Math.PI);
    expect(Math.abs(shortestAngleDelta(0, -Math.PI))).toBeCloseTo(Math.PI);
    expect(Math.abs(shortestAngleDelta(3, -3))).toBeLessThanOrEqual(Math.PI);
  });

  it("lerpShortestAngle steps toward target along shortest arc", () => {
    const from = 6.2;
    const to = 0.1;
    const a = lerpShortestAngle(from, to, 0.5);
    expect(Number.isFinite(a)).toBe(true);
    const full = Math.abs(shortestAngleDelta(from, to));
    const half = Math.abs(shortestAngleDelta(from, a));
    expect(half).toBeLessThanOrEqual(full + 1e-6);
  });

  it("smoothAngleToward approaches target over time", () => {
    let cur: number | undefined = 0;
    for (let i = 0; i < 20; i++) {
      cur = smoothAngleToward(cur, Math.PI / 2, 16, 12);
    }
    expect(cur).toBeGreaterThan(1.3);
    expect(cur).toBeLessThan(Math.PI / 2);
  });
});
