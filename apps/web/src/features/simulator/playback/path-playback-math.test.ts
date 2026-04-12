import { describe, expect, it } from "vitest";

import {
  pathPolylineArcLength,
  sampleMovementPathAtProgress,
} from "@src/features/simulator/playback/path-playback-math";

describe("path-playback-math", () => {
  it("sampleMovementPathAtProgress interpolates mid-segment", () => {
    const pts = [
      { nx: 0, ny: 0 },
      { nx: 1, ny: 0 },
    ];
    const mid = sampleMovementPathAtProgress(pts, 0.5);
    expect(mid?.nx).toBeCloseTo(0.5);
    expect(mid?.ny).toBeCloseTo(0);
    expect(mid?.headingRad).toBeCloseTo(0);
  });

  it("pathPolylineArcLength sums segments", () => {
    const len = pathPolylineArcLength([
      { nx: 0, ny: 0 },
      { nx: 0.3, ny: 0.4 },
      { nx: 0.3, ny: 0.9 },
    ]);
    expect(len).toBeCloseTo(1.0);
  });
});
