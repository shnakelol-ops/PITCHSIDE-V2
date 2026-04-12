import { describe, expect, it, vi } from "vitest";

import { MovementPathStore } from "@src/features/simulator/path/movement-path-store";

describe("MovementPathStore", () => {
  it("starts main path and appends points", () => {
    const store = new MovementPathStore();
    store.startPath("a");
    store.appendPoint("a", 0.1, 0.2);
    store.appendPoint("a", 0.5, 0.5);
    const p = store.getPath("a");
    expect(p?.points.length).toBeGreaterThanOrEqual(2);
  });

  it("stores shadow run separately and links mainPathId when main exists", () => {
    const store = new MovementPathStore();
    store.startPath("p1");
    const mainId = store.getPath("p1")!.id;
    store.startShadowPath("p1");
    const sh = store.getShadowRun("p1");
    expect(sh).toBeDefined();
    expect(sh!.microAthleteId).toBe("p1");
    expect(sh!.mainPathId).toBe(mainId);
    expect(sh!.points).toEqual([]);
  });

  it("updates shadow mainPathId when main path is re-recorded", () => {
    const store = new MovementPathStore();
    store.startPath("p1");
    const id1 = store.getPath("p1")!.id;
    store.startShadowPath("p1");
    expect(store.getShadowRun("p1")!.mainPathId).toBe(id1);
    store.startPath("p1");
    const id2 = store.getPath("p1")!.id;
    expect(id2).not.toBe(id1);
    expect(store.getShadowRun("p1")!.mainPathId).toBe(id2);
  });

  it("notifies subscribers on shadow mutations", () => {
    const store = new MovementPathStore();
    const fn = vi.fn();
    store.subscribe(fn);
    store.startPath("p1");
    expect(fn).toHaveBeenCalled();
    fn.mockClear();
    store.startShadowPath("p1");
    expect(fn).toHaveBeenCalledTimes(1);
    fn.mockClear();
    store.appendShadowPoint("p1", 0.2, 0.3);
    expect(fn).toHaveBeenCalled();
  });
});
