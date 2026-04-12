/**
 * Shared PixiJS helpers for the simulator canvas (single-view discipline, resize, teardown).
 */

/** Cap DPR for mid-range laptops / tablets — balances sharpness vs fill-rate. */
export function recommendedPixiResolution(): number {
  return Math.min(2, window.devicePixelRatio || 1);
}

export type DestroyPixiAppOptions = {
  /** When false, keeps the host `<canvas>` in the DOM (controlled-canvas pattern). */
  removeView?: boolean;
};

/**
 * Destroy a Pixi Application with predictable defaults for a React-owned canvas.
 */
export function destroyPixiApplication(
  app: import("pixi.js").Application | null | undefined,
  options?: DestroyPixiAppOptions,
): void {
  if (!app) return;
  try {
    app.destroy(
      { removeView: options?.removeView ?? false },
      { children: true, texture: true, textureSource: true, context: true },
    );
  } catch {
    /* already destroyed */
  }
}

/**
 * Warn if more than one canvas exists under the host (Pixi or bugs adding extras).
 */
export function warnIfMultipleCanvases(
  host: HTMLElement,
  label = "PitchCanvas",
): void {
  if (typeof window === "undefined") return;
  const n = host.querySelectorAll("canvas").length;
  if (n > 1) {
    console.warn(
      `[${label}] Expected exactly one <canvas> inside host; found ${n}. Check for duplicate Pixi apps or stray canvases.`,
    );
  }
}

export function letterboxWorldToView(
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
): { scale: number; offsetX: number; offsetY: number } {
  if (viewW <= 0 || viewH <= 0 || worldW <= 0 || worldH <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(viewW / worldW, viewH / worldH);
  const offsetX = (viewW - worldW * scale) * 0.5;
  const offsetY = (viewH - worldH * scale) * 0.5;
  return { scale, offsetX, offsetY };
}
