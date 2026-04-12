import { Container, FillGradient, Graphics, Sprite } from "pixi.js";

import { getPitchConfig, type PitchSport } from "@/config/pitchConfig";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";

import {
  buildPremiumMarkingsFaceSvg,
  buildPremiumMarkingsTurfUnderlaySvg,
} from "./premium-markings-broadcast";
import { bakePremiumTurfTexture } from "./premium-turf-baker";

export type PremiumPitchMount = {
  root: Container;
  dispose: () => void;
};

/**
 * Standalone premium pitch stack: coaching-console chassis, baked turf, broadcast markings,
 * subtle centre falloff, restrained specular — mounts at world 0..viewBox (160×100).
 */
export class PremiumPitchRenderer {
  readonly root: Container;
  private readonly disposers: (() => void)[] = [];

  constructor(sport: PitchSport) {
    this.root = new Container();
    this.root.label = "premiumPitch";
    this.root.sortableChildren = true;
    this.build(sport);
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.root.destroy({ children: true });
  }

  private build(sport: PitchSport): void {
    const { markings: markingSpecs } = getPitchConfig(sport);
    const { w: vbW, h: vbH } = BOARD_PITCH_VIEWBOX;

    const panel = new Container();
    panel.label = "premiumPitchPanel";
    this.root.addChild(panel);

    const pad = 2.95;
    const cornerR = 2.35;
    const chassis = new Graphics();
    chassis.label = "premiumPitchChassis";
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
    face.label = "premiumPitchFace";
    face.sortableChildren = true;
    panel.addChild(face);

    const turfTex = bakePremiumTurfTexture(sport);
    this.disposers.push(() => turfTex.destroy());
    const turf = new Sprite(turfTex);
    turf.label = "premiumTurf";
    turf.width = vbW;
    turf.height = vbH;
    turf.zIndex = 0;
    face.addChild(turf);

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
    depth.label = "premiumDepthFalloff";
    depth.zIndex = 2;
    depth.rect(0, 0, vbW, vbH).fill(vignette);
    depth.blendMode = "multiply";
    depth.alpha = 0.38;
    face.addChild(depth);

    const markingUnderlay = new Graphics();
    markingUnderlay.label = "premiumMarkingsTurfCut";
    markingUnderlay.zIndex = 3;
    markingUnderlay.svg(buildPremiumMarkingsTurfUnderlaySvg(markingSpecs));
    face.addChild(markingUnderlay);

    const linePaint = new Graphics();
    linePaint.label = "premiumMarkingsFace";
    linePaint.zIndex = 4;
    linePaint.svg(buildPremiumMarkingsFaceSvg(markingSpecs));
    face.addChild(linePaint);

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
    glass.label = "premiumFaceSheen";
    glass.zIndex = 7;
    glass.rect(0, 0, vbW, vbH).fill(sheen);
    glass.blendMode = "screen";
    glass.alpha = 0.16;
    face.addChild(glass);

    const lip = new Graphics();
    lip.label = "premiumPitchLip";
    lip.zIndex = 9;
    lip
      .roundRect(0.45, 0.45, vbW - 0.9, vbH - 0.9, 0.35)
      .stroke({ width: 0.42, color: "rgba(240, 248, 244, 0.07)" });
    face.addChild(lip);

    face.sortChildren();
  }
}

/** Preferred mount API — mirrors legacy `{ root, dispose }` pitch mount shape. */
export function mountPremiumPitchRenderer(sport: PitchSport): PremiumPitchMount {
  const renderer = new PremiumPitchRenderer(sport);
  return {
    root: renderer.root,
    dispose: () => renderer.dispose(),
  };
}

/** Alias for drop-in parity with `createSimulatorPitchRoot` naming. */
export function createPremiumPitchRoot(sport: PitchSport): PremiumPitchMount {
  return mountPremiumPitchRenderer(sport);
}
