import { Sprite, Texture } from "pixi.js";

import type { PitchMarking } from "@/config/pitchConfig";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";

function parseLineDash(s?: string): number[] {
  if (s == null || !s.trim()) return [];
  return s
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

/**
 * Strokes selected SVG `path` markings via native 2D `Path2D` at supersampled resolution.
 * Browser curve rasterisation avoids Pixi `GraphicsPath` mesh faceting on elliptical arcs.
 */
export function createSmoothRasterPathMarkingsSprite(
  markings: readonly PitchMarking[],
  options: {
    pathPredicate: (m: PitchMarking) => boolean;
    /** Supersample factor vs viewBox (e.g. 8 → 1280×800 backing store for 160×100). */
    resolutionScale: number;
  },
): Sprite {
  const { w: vbW, h: vbH } = BOARD_PITCH_VIEWBOX;
  const R = Math.max(4, Math.min(16, options.resolutionScale));

  const paths = markings.filter(
    (m): m is Extract<PitchMarking, { kind: "path" }> =>
      m.kind === "path" && options.pathPredicate(m),
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(vbW * R));
  canvas.height = Math.max(1, Math.round(vbH * R));
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    const empty = new Sprite(Texture.EMPTY);
    empty.width = vbW;
    empty.height = vbH;
    return empty;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(R, 0, 0, R, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  for (const m of paths) {
    if (m.stroke == null || m.stroke === "none" || (m.strokeWidth ?? 0) <= 0) continue;
    try {
      const p = new Path2D(m.d);
      ctx.strokeStyle = m.stroke;
      ctx.lineWidth = m.strokeWidth;
      const dash = parseLineDash(m.strokeDasharray);
      ctx.setLineDash(dash.length ? dash : []);
      ctx.globalAlpha = m.opacity ?? 1;
      ctx.stroke(p);
    } catch {
      /* invalid d for Path2D — skip */
    }
  }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const tex = Texture.from(canvas);
  tex.source.style.scaleMode = "linear";
  const sprite = new Sprite(tex);
  sprite.label = "smoothRasterPathMarkings";
  sprite.width = vbW;
  sprite.height = vbH;
  return sprite;
}

/** Gaelic simulator: penalty-box-style arcs authored with `skipLineGlow` (D + 2-point arcs). */
export function isGaelicSkipLineGlowPath(m: PitchMarking): boolean {
  return m.kind === "path" && m.skipLineGlow === true;
}

/** Supersample scale from device pixel ratio for close-up screenshots. */
export function smoothPathMarkingsResolutionScale(): number {
  if (typeof window === "undefined") return 8;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(16, Math.max(6, Math.ceil(dpr * 6)));
}
