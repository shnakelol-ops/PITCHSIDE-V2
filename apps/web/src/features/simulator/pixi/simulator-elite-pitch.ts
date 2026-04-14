/**
 * Elite simulator pitch presentation (Pixi v8) — full replacement for legacy pitch stack.
 * Layered turf material, mowing read, stadium flood, dual-pass line paint, glass/turf console read.
 * Soccer vs Gaelic vs Hurling: distinct turf tuning; markings still from `getPitchConfig` (unchanged model).
 */
import {
  ColorMatrixFilter,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Texture,
  TilingSprite,
} from "pixi.js";

import {
  getPitchConfig,
  type PitchMarking,
  type PitchSport,
} from "@/config/pitchConfig";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";

export type SimulatorPitchMount = {
  root: Container;
  dispose: () => void;
};

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type TurfSkin = {
  baseStops: { offset: number; color: string }[];
  mowTint: string;
  mowAlpha: number;
  grainAlpha: number;
  floodTop: string;
  floodAlpha: number;
  contrast: number;
  saturate: number;
};

function turfSkinForSport(sport: PitchSport): TurfSkin {
  if (sport === "soccer") {
    return {
      baseStops: [
        { offset: 0, color: "#0a1f12" },
        { offset: 0.4, color: "#123c24" },
        { offset: 0.72, color: "#1a5230" },
        { offset: 1, color: "#0e2a18" },
      ],
      mowTint: "#173828",
      mowAlpha: 0.2,
      grainAlpha: 0.1,
      floodTop: "rgba(205, 238, 214, 0.085)",
      floodAlpha: 0.48,
      contrast: 1.08,
      saturate: 1.14,
    };
  }
  if (sport === "hurling") {
    return {
      baseStops: [
        { offset: 0, color: "#061916" },
        { offset: 0.42, color: "#0e322c" },
        { offset: 0.76, color: "#134a40" },
        { offset: 1, color: "#0a2620" },
      ],
      mowTint: "#0d332c",
      mowAlpha: 0.24,
      grainAlpha: 0.11,
      floodTop: "rgba(188, 232, 212, 0.09)",
      floodAlpha: 0.5,
      contrast: 1.065,
      saturate: 1.09,
    };
  }
  return {
    baseStops: [
      { offset: 0, color: "#051814" },
      { offset: 0.38, color: "#0c2e26" },
      { offset: 0.74, color: "#124236" },
      { offset: 1, color: "#08221c" },
    ],
    mowTint: "#0b342b",
    mowAlpha: 0.26,
    grainAlpha: 0.12,
    floodTop: "rgba(180, 236, 208, 0.095)",
    floodAlpha: 0.52,
    contrast: 1.06,
    saturate: 1.1,
  };
}

function isSecondaryMarking(m: PitchMarking): boolean {
  switch (m.kind) {
    case "line":
      return Boolean(m.strokeDasharray?.length) || m.strokeWidth < 0.44;
    case "path":
      return Boolean(m.strokeDasharray?.length) || m.strokeWidth < 0.44;
    case "rect":
      if (m.w >= 150 && m.h >= 88) return false;
      return m.strokeWidth < 0.46;
    case "circle":
      return (m.strokeWidth ?? 1) < 0.42;
    case "ellipse":
      return m.strokeWidth < 0.42;
    default:
      return false;
  }
}

function eliteLineInk(stroke: string, secondary: boolean, sport: PitchSport): string {
  const r = sport === "soccer" ? 228 : 224;
  const g = sport === "soccer" ? 236 : 238;
  const b = 244;
  const rgba = stroke.match(
    /rgba\s*\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/i,
  );
  if (rgba) {
    const a = Number.parseFloat(rgba[1]);
    const factor = secondary ? 0.78 : 0.94;
    const a2 = Math.max(0.18, Math.min(1, a * factor));
    return `rgba(${r}, ${g}, ${b}, ${a2.toFixed(3)})`;
  }
  if (/rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\)/i.test(stroke)) {
    return secondary ? `rgba(${r},${g - 2},${b - 2},0.82)` : `rgba(${r + 2},${g + 2},${b},0.96)`;
  }
  return stroke;
}

function applyElitePresentation(
  m: PitchMarking,
  sport: PitchSport,
  layer: "chalk" | "core",
): PitchMarking {
  const secondary = isSecondaryMarking(m);
  const baseMul = sport === "soccer" ? 1.16 : 1.12;
  const wMul = (secondary ? baseMul * 0.95 : baseMul * 1.1) * (layer === "chalk" ? 1.38 : 1);

  const ink = (stroke: string) => {
    const base = eliteLineInk(stroke, secondary, sport);
    if (layer !== "chalk") return base;
    const m2 = base.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
    if (m2) {
      const a = Number.parseFloat(m2[4]) * 0.32;
      return `rgba(${m2[1]},${m2[2]},${m2[3]},${Math.max(0.07, Math.min(0.48, a)).toFixed(3)})`;
    }
    return base;
  };

  const sw = (w: number) => w * wMul;

  switch (m.kind) {
    case "line":
      return { ...m, stroke: ink(m.stroke), strokeWidth: sw(m.strokeWidth) };
    case "rect":
      return { ...m, stroke: ink(m.stroke), strokeWidth: sw(m.strokeWidth) };
    case "circle":
      if (m.stroke == null || m.stroke === "none" || m.strokeWidth == null) return m;
      return { ...m, stroke: ink(m.stroke), strokeWidth: sw(m.strokeWidth) };
    case "ellipse":
      return { ...m, stroke: ink(m.stroke), strokeWidth: sw(m.strokeWidth) };
    case "path":
      return { ...m, stroke: ink(m.stroke), strokeWidth: sw(m.strokeWidth) };
    default:
      return m;
  }
}

function markingToSvgFragment(m: PitchMarking): string | null {
  switch (m.kind) {
    case "line": {
      if (m.stroke === "none" || m.strokeWidth === 0) return null;
      const dash = m.strokeDasharray
        ? ` stroke-dasharray="${escapeXmlAttr(m.strokeDasharray)}"`
        : "";
      return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="${escapeXmlAttr(m.stroke)}" stroke-width="${m.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dash} />`;
    }
    case "rect": {
      const fill =
        m.fill != null && m.fill !== "none"
          ? ` fill="${escapeXmlAttr(m.fill)}"`
          : ` fill="none"`;
      if (m.stroke === "none" || m.strokeWidth === 0) {
        return `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}"${fill} />`;
      }
      return `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}"${fill} stroke="${escapeXmlAttr(m.stroke)}" stroke-width="${m.strokeWidth}" stroke-linejoin="round" />`;
    }
    case "circle": {
      const fill =
        m.fill != null && m.fill !== "none"
          ? ` fill="${escapeXmlAttr(m.fill)}"`
          : ` fill="none"`;
      const stroke =
        m.stroke != null && m.stroke !== "none" && (m.strokeWidth ?? 0) > 0
          ? ` stroke="${escapeXmlAttr(m.stroke)}" stroke-width="${m.strokeWidth ?? 0}" stroke-linejoin="round"`
          : "";
      return `<circle cx="${m.cx}" cy="${m.cy}" r="${m.r}"${fill}${stroke} />`;
    }
    case "ellipse": {
      const fillAttr =
        m.fill != null && m.fill !== "none"
          ? ` fill="${escapeXmlAttr(m.fill)}"`
          : ` fill="none"`;
      if (m.stroke === "none" || m.strokeWidth === 0) {
        return `<ellipse cx="${m.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}"${fillAttr} />`;
      }
      return `<ellipse cx="${m.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}"${fillAttr} stroke="${escapeXmlAttr(m.stroke)}" stroke-width="${m.strokeWidth}" stroke-linejoin="round" />`;
    }
    case "path": {
      if (m.stroke === "none" || m.strokeWidth === 0) {
        const fillOnly =
          m.fill != null && m.fill !== "none"
            ? ` fill="${escapeXmlAttr(m.fill)}"`
            : ` fill="none"`;
        const opacity =
          m.opacity != null && m.opacity !== 1 ? ` opacity="${m.opacity}"` : "";
        return `<path d="${escapeXmlAttr(m.d)}"${fillOnly}${opacity} />`;
      }
      const fill =
        m.fill != null && m.fill !== "none"
          ? ` fill="${escapeXmlAttr(m.fill)}"`
          : ` fill="none"`;
      const opacity =
        m.opacity != null && m.opacity !== 1 ? ` opacity="${m.opacity}"` : "";
      const cap = m.strokeLinecap ?? "round";
      const dash = m.strokeDasharray
        ? ` stroke-dasharray="${escapeXmlAttr(m.strokeDasharray)}"`
        : "";
      return `<path d="${escapeXmlAttr(m.d)}"${fill} stroke="${escapeXmlAttr(m.stroke)}" stroke-width="${m.strokeWidth}" stroke-linecap="${cap}" stroke-linejoin="round"${opacity}${dash} />`;
    }
    case "text":
      return null;
    default:
      return null;
  }
}

function buildMarkingsSvg(markings: PitchMarking[]): string {
  const inner = markings
    .map((m) => markingToSvgFragment(m))
    .filter((s): s is string => s != null && s.length > 0)
    .join("");
  const { w, h } = BOARD_PITCH_VIEWBOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">${inner}</svg>`;
}

function createTurfGrainTexture(): Texture {
  const W = 200;
  const H = 128;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 820; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const a = 0.035 + Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 0.85})`;
    ctx.fillRect(x, y, 1, 1);
  }
  return Texture.from(canvas);
}

function createMowingStripeTexture(skin: TurfSkin): Texture {
  const W = 72;
  const H = 72;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  for (let x = 0; x < W; x += 9) {
    ctx.fillStyle = skin.mowTint;
    ctx.globalAlpha = (x / 9) % 2 === 0 ? 0.16 : 0.07;
    ctx.fillRect(x, 0, 4.5, H);
  }
  ctx.globalAlpha = 1;
  return Texture.from(canvas);
}

export function createSimulatorPitchRoot(sport: PitchSport): SimulatorPitchMount {
  const { markings } = getPitchConfig(sport);
  const skin = turfSkinForSport(sport);

  const chalkSource = markings.filter(
    (m) => !(m.kind === "path" && m.skipLineGlow === true),
  );
  const chalkMarkings = chalkSource.map((m) => applyElitePresentation(m, sport, "chalk"));
  const coreMarkings = markings.map((m) => applyElitePresentation(m, sport, "core"));

  const chalkSvg = buildMarkingsSvg(chalkMarkings);
  const coreSvg = buildMarkingsSvg(coreMarkings);

  const root = new Container();
  const disposers: (() => void)[] = [];
  const { w: vbW, h: vbH } = BOARD_PITCH_VIEWBOX;

  const turfStack = new Container();

  const baseGradient = new FillGradient({
    type: "linear",
    start: { x: 0.1, y: 0 },
    end: { x: 0.5, y: 1 },
    textureSpace: "local",
    colorStops: skin.baseStops,
  });
  disposers.push(() => baseGradient.destroy());

  const base = new Graphics();
  base.rect(0, 0, vbW, vbH).fill(baseGradient);
  turfStack.addChild(base);

  const grainTex = createTurfGrainTexture();
  disposers.push(() => grainTex.destroy());
  const grain = new Sprite(grainTex);
  grain.width = vbW;
  grain.height = vbH;
  grain.alpha = skin.grainAlpha;
  grain.blendMode = "overlay";
  turfStack.addChild(grain);

  const mowTex = createMowingStripeTexture(skin);
  disposers.push(() => mowTex.destroy());
  const mow = new TilingSprite({
    texture: mowTex,
    width: vbW,
    height: vbH,
  });
  mow.tileScale.set(2.2, 2.2);
  mow.rotation = -0.02;
  mow.alpha = skin.mowAlpha;
  mow.blendMode = "multiply";
  turfStack.addChild(mow);

  const lateralSheen = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: "rgba(0,0,0,0.12)" },
      { offset: 0.2, color: "rgba(255,255,255,0.038)" },
      { offset: 0.5, color: "rgba(0,0,0,0.05)" },
      { offset: 0.8, color: "rgba(255,255,255,0.03)" },
      { offset: 1, color: "rgba(0,0,0,0.1)" },
    ],
  });
  disposers.push(() => lateralSheen.destroy());
  const sheen = new Graphics();
  sheen.rect(0, 0, vbW, vbH).fill(lateralSheen);
  sheen.blendMode = "overlay";
  sheen.alpha = 0.42;
  turfStack.addChild(sheen);

  const flood = new FillGradient({
    type: "linear",
    start: { x: 0.32, y: 0 },
    end: { x: 0.52, y: 0.9 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: skin.floodTop },
      { offset: 0.5, color: "rgba(255,255,255,0.018)" },
      { offset: 1, color: "#00000000" },
    ],
  });
  disposers.push(() => flood.destroy());
  const floodG = new Graphics();
  floodG.rect(0, 0, vbW, vbH).fill(flood);
  floodG.blendMode = "screen";
  floodG.alpha = skin.floodAlpha;
  turfStack.addChild(floodG);

  const grade = new ColorMatrixFilter();
  grade.contrast(skin.contrast, false);
  grade.saturate(skin.saturate, false);
  turfStack.filters = [grade];
  disposers.push(() => grade.destroy());

  root.addChild(turfStack);

  const chalkLayer = new Graphics();
  chalkLayer.svg(chalkSvg);
  chalkLayer.blendMode = "screen";
  chalkLayer.alpha = 0.22;
  root.addChild(chalkLayer);

  const lines = new Graphics();
  lines.svg(coreSvg);
  root.addChild(lines);

  const glass = new FillGradient({
    type: "linear",
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: "rgba(255,255,255,0.048)" },
      { offset: 0.1, color: "rgba(255,255,255,0.015)" },
      { offset: 0.52, color: "#00000000" },
      { offset: 1, color: "rgba(2,10,14,0.09)" },
    ],
  });
  disposers.push(() => glass.destroy());
  const glassG = new Graphics();
  glassG.rect(0, 0, vbW, vbH).fill(glass);
  glassG.blendMode = "overlay";
  glassG.alpha = 0.32;
  root.addChild(glassG);

  const vignette = new FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.48 },
    innerRadius: 0,
    outerRadius: 1,
    outerCenter: { x: 0.5, y: 0.48 },
    textureSpace: "local",
    colorStops: [
      { offset: 0.26, color: "#00000000" },
      { offset: 0.8, color: "rgba(0,0,0,0.13)" },
      { offset: 1, color: "rgba(0,0,0,0.26)" },
    ],
  });
  disposers.push(() => vignette.destroy());
  const vig = new Graphics();
  vig.rect(0, 0, vbW, vbH).fill(vignette);
  vig.blendMode = "multiply";
  root.addChild(vig);

  const bezel = new Graphics();
  bezel
    .rect(0.55, 0.55, vbW - 1.1, vbH - 1.1)
    .stroke({ width: 0.5, color: "rgba(248, 252, 255, 0.11)" });
  bezel
    .rect(0, 0, vbW, vbH)
    .stroke({ width: 1.05, color: "rgba(0,0,0,0.48)" });
  bezel
    .moveTo(1.25, 1.25)
    .lineTo(vbW - 1.25, 1.25)
    .stroke({ width: 0.2, color: "rgba(255,255,255,0.065)", cap: "round" });
  root.addChild(bezel);

  return {
    root,
    dispose: () => {
      for (const d of disposers) d();
      root.destroy({ children: true });
    },
  };
}
