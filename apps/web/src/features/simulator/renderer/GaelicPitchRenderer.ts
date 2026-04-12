import {
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Texture,
  TilingSprite,
} from "pixi.js";

import { getPitchConfig, type PitchSport } from "@/config/pitchConfig";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";

import {
  bakePremiumTurfWashTexture,
  gaelicFamilyStripeTilingParams,
} from "./premium-turf-baker";
import {
  createSmoothRasterPathMarkingsSprite,
  isGaelicSkipLineGlowPath,
  smoothPathMarkingsResolutionScale,
} from "./smooth-path-markings-sprite";
import { createUnifiedPitchMarkingsGraphics } from "./unified-pitch-markings-graphics";

export type GaelicPitchMount = {
  root: Container;
  dispose: () => void;
};

/** Tile for vertical mowing — neutral multiply so it stacks on wash without re-baking stripes into grass. */
function createGaelicStripeTileTexture(sport: Extract<PitchSport, "gaelic" | "hurling">): Texture {
  const W = 56;
  const H = 128;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.WHITE;

  const band = sport === "hurling" ? 9 : 8;
  for (let x = 0; x < W; x += band) {
    const stripe = (x / band) % 2 === 0;
    ctx.fillStyle = stripe
      ? sport === "hurling"
        ? "rgba(255,255,255,0.22)"
        : "rgba(255,255,255,0.26)"
      : "rgba(0,0,0,0.18)";
    ctx.fillRect(x, 0, band * 0.52, H);
  }
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let y = 0; y < H; y += 17) {
    ctx.fillRect(0, y, W, 2);
  }

  const tex = Texture.from(canvas);
  tex.source.style.scaleMode = "linear";
  return tex;
}

/**
 * GAA simulator pitch: same 160×100 world and {@link getPitchConfig} markings as the board,
 * with turf wash and vertical stripes as separate layers (stripes are not baked into grass pixels).
 */
export class GaelicPitchRenderer {
  readonly root: Container;
  private readonly disposers: (() => void)[] = [];

  constructor(sport: Extract<PitchSport, "gaelic" | "hurling">) {
    this.root = new Container();
    this.root.label = "gaelicPitch";
    this.root.sortableChildren = true;
    this.build(sport);
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.root.destroy({ children: true });
  }

  private build(sport: Extract<PitchSport, "gaelic" | "hurling">): void {
    const { markings: markingSpecs } = getPitchConfig("gaelic");
    const { w: vbW, h: vbH } = BOARD_PITCH_VIEWBOX;

    const panel = new Container();
    panel.label = "gaelicPitchPanel";
    this.root.addChild(panel);

    const pad = 2.95;
    const cornerR = 2.35;
    const chassis = new Graphics();
    chassis.label = "gaelicPitchChassis";
    chassis.roundRect(-pad, -pad, vbW + pad * 2, vbH + pad * 2, cornerR).fill({
      color: 0x020706,
      alpha: 1,
    });
    chassis
      .roundRect(-pad + 0.35, -pad + 0.35, vbW + pad * 2 - 0.7, vbH + pad * 2 - 0.7, cornerR - 0.25)
      .stroke({ width: 0.55, color: "rgba(118, 138, 128, 0.14)" });
    chassis
      .moveTo(-pad + 1.1, -pad + 0.65)
      .lineTo(vbW + pad - 1.1, -pad + 0.65)
      .stroke({
        width: 0.22,
        color: "rgba(255, 255, 255, 0.055)",
        cap: "round",
      });
    chassis
      .moveTo(-pad + 0.55, vbH + pad - 0.85)
      .lineTo(vbW + pad - 0.55, vbH + pad - 0.85)
      .stroke({
        width: 0.35,
        color: "rgba(0, 0, 0, 0.45)",
        cap: "round",
      });
    panel.addChild(chassis);

    const face = new Container();
    face.label = "gaelicPitchFace";
    face.sortableChildren = true;
    panel.addChild(face);

    const washTex = bakePremiumTurfWashTexture(sport);
    this.disposers.push(() => washTex.destroy());
    const wash = new Sprite(washTex);
    wash.label = "gaelicTurfWash";
    wash.width = vbW;
    wash.height = vbH;
    wash.zIndex = 0;
    face.addChild(wash);

    const stripeTex = createGaelicStripeTileTexture(sport);
    this.disposers.push(() => stripeTex.destroy());
    const stripes = new TilingSprite({
      texture: stripeTex,
      width: vbW,
      height: vbH,
    });
    stripes.label = "gaelicTurfStripes";
    const stripeParams = gaelicFamilyStripeTilingParams(sport);
    stripes.tileScale.set(stripeParams.tileScaleX, stripeParams.tileScaleY);
    stripes.alpha = stripeParams.alpha;
    stripes.blendMode = "multiply";
    stripes.zIndex = 1;
    face.addChild(stripes);

    const vignette = new FillGradient({
      type: "radial",
      center: { x: 0.5, y: 0.48 },
      innerRadius: 0,
      outerRadius: 1,
      outerCenter: { x: 0.5, y: 0.48 },
      textureSpace: "local",
      colorStops: [
        { offset: 0.32, color: "#00000000" },
        { offset: 0.78, color: "rgba(0, 14, 10, 0.1)" },
        { offset: 1, color: "rgba(0, 18, 12, 0.2)" },
      ],
    });
    this.disposers.push(() => vignette.destroy());
    const depth = new Graphics();
    depth.label = "gaelicDepthFalloff";
    depth.zIndex = 2;
    depth.rect(0, 0, vbW, vbH).fill(vignette);
    depth.blendMode = "multiply";
    depth.alpha = 0.38;
    face.addChild(depth);

    const linePaint = createUnifiedPitchMarkingsGraphics(markingSpecs, {
      skipMarking: isGaelicSkipLineGlowPath,
    });
    linePaint.label = "gaelicMarkingsUnified";
    linePaint.zIndex = 4;
    face.addChild(linePaint);

    const arcSmooth = createSmoothRasterPathMarkingsSprite(markingSpecs, {
      pathPredicate: isGaelicSkipLineGlowPath,
      resolutionScale: smoothPathMarkingsResolutionScale(),
    });
    arcSmooth.label = "gaelicSmoothArcRaster";
    arcSmooth.zIndex = 5;
    this.disposers.push(() => {
      arcSmooth.texture?.destroy(true);
    });
    face.addChild(arcSmooth);

    const sheen = new FillGradient({
      type: "linear",
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
      textureSpace: "local",
      colorStops: [
        { offset: 0, color: "rgba(255, 255, 255, 0.055)" },
        { offset: 0.12, color: "rgba(255, 255, 255, 0.018)" },
        { offset: 0.55, color: "#00000000" },
        { offset: 1, color: "rgba(2, 8, 6, 0.07)" },
      ],
    });
    this.disposers.push(() => sheen.destroy());
    const glass = new Graphics();
    glass.label = "gaelicFaceSheen";
    glass.zIndex = 7;
    glass.rect(0, 0, vbW, vbH).fill(sheen);
    glass.blendMode = "screen";
    glass.alpha = 0.16;
    face.addChild(glass);

    const lip = new Graphics();
    lip.label = "gaelicPitchLip";
    lip.zIndex = 9;
    lip
      .roundRect(0.45, 0.45, vbW - 0.9, vbH - 0.9, 0.35)
      .stroke({ width: 0.42, color: "rgba(240, 248, 244, 0.07)" });
    face.addChild(lip);

    face.sortChildren();
  }
}

export function mountGaelicPitchRenderer(
  sport: Extract<PitchSport, "gaelic" | "hurling">,
): GaelicPitchMount {
  const renderer = new GaelicPitchRenderer(sport);
  return {
    root: renderer.root,
    dispose: () => renderer.dispose(),
  };
}
