import { describe, expect, it } from "vitest";

import { smoothBoardNormPolylineForDisplay } from "@src/features/simulator/pixi/path-display-smoothing";

describe("smoothBoardNormPolylineForDisplay", () => {
  it("keeps endpoints fixed", () => {
    const pts = [
      { nx: 0.1, ny: 0.2 },
      { nx: 0.5, ny: 0.9 },
      { nx: 0.9, ny: 0.2 },
    ];
    const s = smoothBoardNormPolylineForDisplay(pts, 2);
    expect(s[0].nx).toBe(0.1);
    expect(s[0].ny).toBe(0.2);
    expect(s[s.length - 1].nx).toBe(0.9);
    expect(s[s.length - 1].ny).toBe(0.2);
  });

  it("eases interior away from sharp spike", () => {
    const pts = [
      { nx: 0.2, ny: 0.5 },
      { nx: 0.5, ny: 0.05 },
      { nx: 0.8, ny: 0.5 },
    ];
    const s = smoothBoardNormPolylineForDisplay(pts, 2);
    expect(s[1].ny).toBeGreaterThan(pts[1].ny);
  });
});
