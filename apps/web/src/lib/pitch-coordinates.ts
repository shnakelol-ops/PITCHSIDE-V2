/**
 * Shared board ↔ world transforms (normalised 0–1, 160×100 world).
 * Single place for resize / letterboxing math per ARCHITECTURE.md §4.1.
 */

import type { PitchConfig } from "@/config/pitchConfig";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";

export type BoardNorm = { nx: number; ny: number };

export type PitchWorldPoint = { x: number; y: number };

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function boardNormToWorld(
  nx: number,
  ny: number,
  viewBox: Pick<PitchConfig["viewBox"], "w" | "h"> = BOARD_PITCH_VIEWBOX,
): PitchWorldPoint {
  return {
    x: clamp01(nx) * viewBox.w,
    y: clamp01(ny) * viewBox.h,
  };
}

export function worldToBoardNorm(
  x: number,
  y: number,
  viewBox: Pick<PitchConfig["viewBox"], "w" | "h"> = BOARD_PITCH_VIEWBOX,
): BoardNorm {
  const nx = viewBox.w > 0 ? clamp01(x / viewBox.w) : 0.5;
  const ny = viewBox.h > 0 ? clamp01(y / viewBox.h) : 0.5;
  return { nx, ny };
}

export type PitchLetterbox = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

/**
 * Fit the pitch viewBox into a CSS-pixel viewport (contain), for Pixi/Konva roots.
 */
export function letterboxPitchWorld(
  viewportCssW: number,
  viewportCssH: number,
  viewBox: Pick<PitchConfig["viewBox"], "w" | "h"> = BOARD_PITCH_VIEWBOX,
): PitchLetterbox {
  if (viewportCssW <= 0 || viewportCssH <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(viewportCssW / viewBox.w, viewportCssH / viewBox.h);
  const offsetX = (viewportCssW - viewBox.w * scale) / 2;
  const offsetY = (viewportCssH - viewBox.h * scale) / 2;
  return { scale, offsetX, offsetY };
}

/**
 * Map a point in **CSS pixels** relative to the top-left of the pitch viewport
 * (same box used for `letterboxPitchWorld(viewportCssW, viewportCssH)`) into
 * board-normalised coordinates. Used by simulator / stats hit-testing.
 */
export function viewportCssToBoardNorm(
  pxCss: number,
  pyCss: number,
  viewportCssW: number,
  viewportCssH: number,
  viewBox: Pick<PitchConfig["viewBox"], "w" | "h"> = BOARD_PITCH_VIEWBOX,
): BoardNorm {
  const { scale, offsetX, offsetY } = letterboxPitchWorld(
    viewportCssW,
    viewportCssH,
    viewBox,
  );
  if (scale <= 0) return { nx: 0.5, ny: 0.5 };
  const wx = (pxCss - offsetX) / scale;
  const wy = (pyCss - offsetY) / scale;
  return worldToBoardNorm(wx, wy, viewBox);
}
