import { Texture } from "pixi.js";

import type { PitchSport } from "@/config/pitchConfig";

const VIEW_H_OVER_W = 100 / 160;

type TurfRecipe = {
  wash: { t: number; c: string }[];
  centreWash: string;
  /** Primary vertical mowing — multiplicative; tuned to read clearly on screen. */
  verticalStripeAmp: number;
  verticalBands: number;
  /** Second harmonic (same axis only) — softens band peaks, still vertical. */
  verticalHarmonicRatio: number;
  grain: number;
};

function recipeForSport(sport: PitchSport): TurfRecipe {
  if (sport === "soccer") {
    return {
      wash: [
        { t: 0, c: "#050d0a" },
        { t: 0.35, c: "#10261c" },
        { t: 0.52, c: "#16382a" },
        { t: 0.68, c: "#122c22" },
        { t: 1, c: "#060f0c" },
      ],
      centreWash: "rgba(198, 228, 208, 0.065)",
      verticalStripeAmp: 0.034,
      verticalBands: 3.85,
      verticalHarmonicRatio: 0.22,
      grain: 0.01,
    };
  }
  if (sport === "hurling") {
    return {
      wash: [
        { t: 0, c: "#040e0c" },
        { t: 0.36, c: "#0f322b" },
        { t: 0.53, c: "#164a40" },
        { t: 0.7, c: "#10342e" },
        { t: 1, c: "#051210" },
      ],
      centreWash: "rgba(186, 236, 220, 0.072)",
      verticalStripeAmp: 0.038,
      verticalBands: 4.05,
      verticalHarmonicRatio: 0.24,
      grain: 0.011,
    };
  }
  /** Gaelic football: stadium-grade green + screenshot-visible vertical mowing (still restrained). */
  return {
    wash: [
      { t: 0, c: "#05140f" },
      { t: 0.28, c: "#0f3d2c" },
      { t: 0.48, c: "#1a5c3e" },
      { t: 0.62, c: "#174a34" },
      { t: 0.78, c: "#123828" },
      { t: 1, c: "#061812" },
    ],
    centreWash: "rgba(200, 248, 218, 0.09)",
    /** ~9% peak deviation + harmonic — clearly reads as mown stripes on screen. */
    verticalStripeAmp: 0.09,
    verticalBands: 5.35,
    verticalHarmonicRatio: 0.2,
    grain: 0.009,
  };
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function premiumTurfBitmapSize(): { W: number; H: number } {
  const W = 640;
  const H = Math.max(64, Math.round(W * VIEW_H_OVER_W));
  return { W, H };
}

function paintTurfWashAndCentre(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  r: TurfRecipe,
): void {
  const lg = ctx.createLinearGradient(0, 0, W, H);
  for (const stop of r.wash) {
    lg.addColorStop(stop.t, stop.c);
  }
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);

  const cx = W * 0.48;
  const cy = H * 0.46;
  const rad = Math.hypot(W, H) * 0.55;
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  rg.addColorStop(0, r.centreWash);
  rg.addColorStop(0.45, "rgba(255,255,255,0.02)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
}

function applyGrainAndOptionalCosineStripes(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  r: TurfRecipe,
  cosineStripes: boolean,
): void {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const twoPi = Math.PI * 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const xf = x / W;
      const i = (y * W + x) * 4;
      let rr = d[i];
      let gg = d[i + 1];
      let bb = d[i + 2];
      if (cosineStripes) {
        const b = r.verticalBands;
        const primary = Math.cos(xf * twoPi * b);
        const harmonic =
          r.verticalHarmonicRatio * Math.cos(xf * twoPi * b * 2 + 0.31);
        const vertical = 1 + r.verticalStripeAmp * (primary + harmonic);
        rr *= vertical;
        gg *= vertical;
        bb *= vertical;
      }
      if (((x * 11 + y * 5) & 511) === 0) {
        const j = (Math.sin(x * 0.05) + Math.cos(y * 0.04)) * r.grain * 18;
        rr += j;
        gg += j * 0.96;
        bb += j * 0.9;
      }
      d[i] = clampByte(rr);
      d[i + 1] = clampByte(gg);
      d[i + 2] = clampByte(bb);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Grass wash + centre light falloff + film grain **without** baked cosine striping.
 * Used by {@link GaelicPitchRenderer} so vertical stripes can be a separate `TilingSprite` layer.
 */
export function bakePremiumTurfWashTexture(sport: PitchSport): Texture {
  const { W, H } = premiumTurfBitmapSize();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    return Texture.WHITE;
  }

  const r = recipeForSport(sport);
  paintTurfWashAndCentre(ctx, W, H, r);
  applyGrainAndOptionalCosineStripes(ctx, W, H, r, false);

  const tex = Texture.from(canvas);
  tex.source.style.scaleMode = "linear";
  return tex;
}

/** TilingSprite tuning for simulator Gaelic stack — ties stripe density to premium recipe bands. */
export function gaelicFamilyStripeTilingParams(
  sport: Extract<PitchSport, "gaelic" | "hurling">,
): { tileScaleX: number; tileScaleY: number; alpha: number } {
  const r = recipeForSport(sport);
  const density = 2.15 / Math.max(2.8, r.verticalBands);
  return {
    tileScaleX: density,
    tileScaleY: 2.05,
    alpha: sport === "hurling" ? 0.33 : 0.36,
  };
}

/**
 * Broad **vertical-only** striping (cosine + small harmonic), screenshot-visible but low contrast.
 */
export function bakePremiumTurfTexture(sport: PitchSport): Texture {
  const { W, H } = premiumTurfBitmapSize();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    return Texture.WHITE;
  }

  const r = recipeForSport(sport);
  paintTurfWashAndCentre(ctx, W, H, r);
  applyGrainAndOptionalCosineStripes(ctx, W, H, r, true);

  const tex = Texture.from(canvas);
  tex.source.style.scaleMode = "linear";
  return tex;
}
