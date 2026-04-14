import type { FederatedPointerEvent } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";
import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";
import { createMicroAthleteView } from "@src/features/simulator/pixi/micro-athlete-view";
import type { MovementPathStore } from "@src/features/simulator/path/movement-path-store";
import { clamp01, viewportCssToBoardNorm } from "@src/lib/pitch-coordinates";

type DragState = {
  id: string;
  offsetNx: number;
  offsetNy: number;
  pointerId: number;
};

/** Shortest-arc blend — biased high so facing tracks motion quickly (no mush). */
function lerpAngle(from: number, to: number, t: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * t;
}

export type PathRecordingConfig = {
  store: MovementPathStore;
  isRecording: () => boolean;
  /** Secondary teaching path for the selected player (mutually exclusive in UI). */
  isShadowRecording?: () => boolean;
  /** When true, pitch draw / athlete drag are disabled (playback owns poses). */
  isPlaybackDriving?: () => boolean;
  onSelectionChange?: (microAthleteId: string | null) => void;
};

export type MountAthletesPixiOptions = {
  layer: Container;
  /** Pitch host element (CSS box aligned with letterboxing). */
  hostEl: HTMLElement;
  initialAthletes: MicroAthlete[];
  pathRecording?: PathRecordingConfig;
};

/**
 * Interaction: drag math, selection, pointer routing.
 * Rendering: delegated to micro-athlete views (sync only what changed).
 */
export function mountAthletesPixi(
  options: MountAthletesPixiOptions,
): {
  dispose: () => void;
  getAthletes: () => MicroAthlete[];
  applyKinematic: (
    microAthleteId: string,
    nx: number,
    ny: number,
    headingRad: number,
  ) => void;
  flushVisuals: (dirtyAthleteIds?: ReadonlySet<string>) => void;
  /** Removes document pointer listeners / capture used for pitch draw or drag. */
  releaseTransientInput: () => void;
} {
  const { layer, hostEl, initialAthletes, pathRecording } = options;

  layer.sortableChildren = true;
  layer.eventMode = "static";

  const athletes = [...initialAthletes];
  let selectedId: string | null = athletes[0]?.id ?? null;
  let childOrderDirty = true;
  let selectionSortEpoch = 0;
  let lastSortedEpoch = -1;

  const applySelection = (id: string | null) => {
    if (id !== selectedId) {
      selectionSortEpoch++;
    }
    selectedId = id;
    pathRecording?.onSelectionChange?.(id);
  };

  let pathCapture: { athleteId: string; pointerId: number; mode: "main" | "shadow" } | null =
    null;
  let captureLayout: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null = null;
  let drag: DragState | null = null;
  let lastDragNx: number | null = null;
  let lastDragNy: number | null = null;
  /** Cached layout while dragging — avoids rect thrash / subpixel jitter. */
  let dragLayout: { left: number; top: number; width: number; height: number } | null =
    null;

  let scaleRafId = 0;
  const runScalePump = () => {
    if (scaleRafId !== 0) return;
    const tick = () => {
      scaleRafId = 0;
      if (syncAll()) {
        scaleRafId = requestAnimationFrame(tick);
      }
    };
    scaleRafId = requestAnimationFrame(tick);
  };

  const views = new Map<string, ReturnType<typeof createMicroAthleteView>>();

  const bg = new Graphics();
  bg.zIndex = -500;
  bg.rect(0, 0, BOARD_PITCH_VIEWBOX.w, BOARD_PITCH_VIEWBOX.h).fill({
    color: 0xffffff,
    alpha: 0.0001,
  });
  bg.eventMode = "static";
  bg.on("pointerdown", (e: FederatedPointerEvent) => {
    if (pathRecording?.isPlaybackDriving?.()) {
      return;
    }
    const drivingOff = pathRecording?.isPlaybackDriving?.() !== true;
    const shadowRecording =
      pathRecording?.isShadowRecording?.() === true && drivingOff;
    const mainRecording =
      pathRecording?.isRecording() === true && drivingOff;

    if (shadowRecording && selectedId != null) {
      e.stopPropagation();
      const native = e.nativeEvent as PointerEvent;
      const pointerId = native.pointerId;
      const rect = hostEl.getBoundingClientRect();
      captureLayout = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      const athlete = findAthlete(selectedId);
      pathRecording.store.startShadowPath(selectedId);
      if (athlete) {
        pathRecording.store.appendShadowPoint(selectedId, athlete.nx, athlete.ny);
      }
      const { nx, ny } = boardFromClient(e.clientX, e.clientY);
      pathRecording.store.appendShadowPoint(selectedId, nx, ny);
      pathCapture = { athleteId: selectedId, pointerId, mode: "shadow" };
      document.addEventListener("pointermove", onPathCaptureMove, {
        passive: true,
      });
      document.addEventListener("pointerup", onPathCaptureUp);
      document.addEventListener("pointercancel", onPathCaptureUp);
      return;
    }

    if (mainRecording && selectedId != null) {
      e.stopPropagation();
      const native = e.nativeEvent as PointerEvent;
      const pointerId = native.pointerId;
      const rect = hostEl.getBoundingClientRect();
      captureLayout = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
      const athlete = findAthlete(selectedId);
      if (!pathRecording.store.getPath(selectedId)) {
        pathRecording.store.startPath(selectedId);
      }
      if (athlete) {
        pathRecording.store.appendPoint(selectedId, athlete.nx, athlete.ny);
      }
      const { nx, ny } = boardFromClient(e.clientX, e.clientY);
      pathRecording.store.appendPoint(selectedId, nx, ny);
      pathCapture = { athleteId: selectedId, pointerId, mode: "main" };
      document.addEventListener("pointermove", onPathCaptureMove, {
        passive: true,
      });
      document.addEventListener("pointerup", onPathCaptureUp);
      document.addEventListener("pointercancel", onPathCaptureUp);
      return;
    }
    applySelection(null);
    syncAll();
    runScalePump();
  });
  layer.addChild(bg);

  const endPathCapture = () => {
    pathCapture = null;
    captureLayout = null;
    document.removeEventListener("pointermove", onPathCaptureMove);
    document.removeEventListener("pointerup", onPathCaptureUp);
    document.removeEventListener("pointercancel", onPathCaptureUp);
  };

  const onPathCaptureMove = (ev: PointerEvent) => {
    if (!pathCapture || ev.pointerId !== pathCapture.pointerId) return;
    const pr = pathRecording;
    const coalesced =
      typeof ev.getCoalescedEvents === "function"
        ? ev.getCoalescedEvents()
        : [];
    const samples = coalesced.length > 0 ? coalesced : [ev];
    if (pathCapture.mode === "shadow") {
      if (!pr?.isShadowRecording?.()) return;
      for (const pe of samples) {
        const { nx, ny } = boardFromClient(pe.clientX, pe.clientY);
        pr.store.appendShadowPoint(pathCapture.athleteId, nx, ny);
      }
      return;
    }
    if (!pr?.isRecording()) return;
    for (const pe of samples) {
      const { nx, ny } = boardFromClient(pe.clientX, pe.clientY);
      pr.store.appendPoint(pathCapture.athleteId, nx, ny);
    }
  };

  const onPathCaptureUp = (ev: PointerEvent) => {
    if (!pathCapture || ev.pointerId !== pathCapture.pointerId) return;
    endPathCapture();
  };

  const ensureView = (id: string) => {
    let v = views.get(id);
    if (!v) {
      v = createMicroAthleteView();
      views.set(id, v);
      layer.addChild(v.container);
      childOrderDirty = true;
      v.container.on("pointerdown", (e: FederatedPointerEvent) =>
        onAthletePointerDown(e, id),
      );
    }
    return v;
  };

  const findAthlete = (id: string) => athletes.find((a) => a.id === id);

  const boardFromClient = (clientX: number, clientY: number) => {
    const r =
      dragLayout ?? captureLayout ?? hostEl.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    return viewportCssToBoardNorm(px, py, r.width, r.height);
  };

  const syncOne = (id: string): boolean => {
    const a = athletes.find((k) => k.id === id);
    if (!a) return false;
    const v = ensureView(id);
    const dragging = drag?.id === id;
    return v.sync(a, selectedId === id, dragging);
  };

  const syncAll = (): boolean => {
    let needsScaleFrame = false;
    for (const a of athletes) {
      if (syncOne(a.id)) needsScaleFrame = true;
    }
    for (const [id, v] of views) {
      if (!athletes.some((a) => a.id === id)) {
        layer.removeChild(v.container);
        v.dispose();
        views.delete(id);
        childOrderDirty = true;
      }
    }
    if (
      childOrderDirty ||
      selectionSortEpoch !== lastSortedEpoch
    ) {
      childOrderDirty = false;
      lastSortedEpoch = selectionSortEpoch;
      layer.sortChildren();
    }
    return needsScaleFrame;
  };

  const syncAthletesSubset = (ids: ReadonlySet<string>): boolean => {
    let needsScaleFrame = false;
    for (const id of ids) {
      if (syncOne(id)) needsScaleFrame = true;
    }
    return needsScaleFrame;
  };

  const updateHeadingFromDelta = (a: MicroAthlete, nx: number, ny: number) => {
    if (lastDragNx == null || lastDragNy == null) {
      lastDragNx = nx;
      lastDragNy = ny;
      return;
    }
    const dx = nx - lastDragNx;
    const dy = ny - lastDragNy;
    const len2 = dx * dx + dy * dy;
    if (len2 > 2e-9) {
      const target = Math.atan2(dy, dx);
      const t = Math.min(0.9, 0.68 + len2 * 140);
      a.headingRad = lerpAngle(a.headingRad, target, t);
    }
    lastDragNx = nx;
    lastDragNy = ny;
  };

  const applyDragAtClient = (clientX: number, clientY: number) => {
    if (!drag) return;
    const a = findAthlete(drag.id);
    if (!a) return;
    const { nx, ny } = boardFromClient(clientX, clientY);
    const nextNx = nx + drag.offsetNx;
    const nextNy = ny + drag.offsetNy;
    a.nx = clamp01(nextNx);
    a.ny = clamp01(nextNy);
    updateHeadingFromDelta(a, a.nx, a.ny);
  };

  const onDocPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const coalesced =
      typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    const samples = coalesced.length > 0 ? coalesced : [e];
    for (const pe of samples) {
      applyDragAtClient(pe.clientX, pe.clientY);
    }
    if (syncOne(drag.id)) runScalePump();
  };

  const endDrag = (withScalePump = true) => {
    if (drag != null) {
      try {
        hostEl.releasePointerCapture(drag.pointerId);
      } catch {
        /* not captured or already released */
      }
    }
    drag = null;
    dragLayout = null;
    lastDragNx = null;
    lastDragNy = null;
    document.removeEventListener("pointermove", onDocPointerMove);
    document.removeEventListener("pointerup", onDocPointerUp);
    document.removeEventListener("pointercancel", onDocPointerUp);
    syncAll();
    if (withScalePump) runScalePump();
  };

  const onDocPointerUp = () => {
    endDrag();
  };

  const onAthletePointerDown = (e: FederatedPointerEvent, id: string) => {
    e.stopPropagation();
    const a = findAthlete(id);
    if (!a) return;
    if (pathRecording?.isPlaybackDriving?.()) {
      applySelection(id);
      syncAll();
      runScalePump();
      return;
    }
    if (pathRecording?.isRecording() || pathRecording?.isShadowRecording?.()) {
      applySelection(id);
      syncAll();
      runScalePump();
      return;
    }
    const native = e.nativeEvent as PointerEvent;
    const pointerId = native.pointerId;
    const r = hostEl.getBoundingClientRect();
    dragLayout = {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    };
    try {
      hostEl.setPointerCapture(pointerId);
    } catch {
      /* host may not accept capture in edge cases */
    }
    applySelection(id);
    const { nx, ny } = boardFromClient(e.clientX, e.clientY);
    drag = {
      id,
      offsetNx: a.nx - nx,
      offsetNy: a.ny - ny,
      pointerId,
    };
    lastDragNx = a.nx;
    lastDragNy = a.ny;
    syncAll();
    runScalePump();
    document.addEventListener("pointermove", onDocPointerMove, { passive: true });
    document.addEventListener("pointerup", onDocPointerUp);
    document.addEventListener("pointercancel", onDocPointerUp);
  };

  for (const a of athletes) ensureView(a.id);
  pathRecording?.onSelectionChange?.(selectedId);
  syncAll();
  runScalePump();

  const applyKinematic = (
    microAthleteId: string,
    nx: number,
    ny: number,
    headingRad: number,
  ) => {
    const a = findAthlete(microAthleteId);
    if (!a) return;
    a.nx = clamp01(nx);
    a.ny = clamp01(ny);
    a.headingRad = headingRad;
  };

  const flushVisuals = (dirtyAthleteIds?: ReadonlySet<string>) => {
    if (dirtyAthleteIds !== undefined && dirtyAthleteIds.size > 0) {
      if (syncAthletesSubset(dirtyAthleteIds)) runScalePump();
      return;
    }
    if (syncAll()) runScalePump();
  };

  const releaseTransientInput = () => {
    endPathCapture();
    endDrag(false);
  };

  return {
    getAthletes: () => athletes.map((a) => ({ ...a })),
    applyKinematic,
    flushVisuals,
    releaseTransientInput,
    dispose: () => {
      if (scaleRafId !== 0) {
        cancelAnimationFrame(scaleRafId);
        scaleRafId = 0;
      }
      releaseTransientInput();
      for (const v of views.values()) v.dispose();
      views.clear();
      layer.removeChildren();
    },
  };
}
