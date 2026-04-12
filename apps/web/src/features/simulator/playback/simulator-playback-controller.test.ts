import { describe, expect, it, vi } from "vitest";

import { MovementPathStore } from "@src/features/simulator/path/movement-path-store";
import { SimulatorPlaybackController } from "@src/features/simulator/playback/simulator-playback-controller";

type MockTicker = {
  deltaMS: number;
  add: (fn: (t: MockTicker) => void) => void;
  remove: (fn: (t: MockTicker) => void) => void;
};

function createMockTicker(): MockTicker {
  const fns: Array<(t: MockTicker) => void> = [];
  const ticker: MockTicker = {
    deltaMS: 16,
    add(fn) {
      fns.push(fn);
    },
    remove(fn) {
      const i = fns.indexOf(fn);
      if (i >= 0) fns.splice(i, 1);
    },
  };
  (ticker as unknown as { _step: () => void })._step = () => {
    for (const fn of [...fns]) fn(ticker);
  };
  return ticker;
}

function stepTicker(ticker: MockTicker): void {
  (ticker as unknown as { _step: () => void })._step();
}

describe("SimulatorPlaybackController", () => {
  it("drops cached playback snapshot when the path store changes while paused", () => {
    const store = new MovementPathStore();
    store.startPath("ma-1");
    store.appendPoint("ma-1", 0.1, 0.2);
    store.appendPoint("ma-1", 0.5, 0.5);

    const ticker = createMockTicker();
    const c = new SimulatorPlaybackController({
      ticker: ticker as unknown as import("pixi.js").Ticker,
      pathStore: store,
      applyPose: vi.fn(),
      flushVisuals: vi.fn(),
      setPlaybackDriving: vi.fn(),
      updateShadowGhosts: vi.fn(),
    });

    const snap = c as unknown as {
      mainSnapshot: Map<string, unknown>;
    };

    c.play();
    expect(snap.mainSnapshot.size).toBeGreaterThan(0);
    c.pause();

    store.appendPoint("ma-1", 0.9, 0.9);
    expect(snap.mainSnapshot.size).toBe(0);

    c.play();
    expect(snap.mainSnapshot.size).toBeGreaterThan(0);

    c.destroy();
  });

  it("does not clear the snapshot mid-playback when the store mutates", () => {
    const store = new MovementPathStore();
    store.startPath("ma-1");
    store.appendPoint("ma-1", 0.1, 0.2);
    store.appendPoint("ma-1", 0.5, 0.5);

    const ticker = createMockTicker();
    const c = new SimulatorPlaybackController({
      ticker: ticker as unknown as import("pixi.js").Ticker,
      pathStore: store,
      applyPose: vi.fn(),
      flushVisuals: vi.fn(),
      setPlaybackDriving: vi.fn(),
      updateShadowGhosts: vi.fn(),
    });

    const snap = c as unknown as {
      mainSnapshot: Map<string, unknown>;
    };

    c.play();
    const sizeDuringPlay = snap.mainSnapshot.size;
    store.appendPoint("ma-1", 0.55, 0.55);
    expect(snap.mainSnapshot.size).toBe(sizeDuringPlay);

    stepTicker(ticker);
    c.destroy();
  });
});
