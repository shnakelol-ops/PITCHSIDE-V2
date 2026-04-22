import { Circle, Container, Graphics } from "pixi.js";

import { boardNormToWorld } from "@src/lib/pitch-coordinates";
import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";
import {
  MICRO_ATHLETE_HIT_RADIUS_WORLD,
  MICRO_ATHLETE_RADIUS_WORLD,
} from "@src/features/simulator/model/micro-athlete";

const R = MICRO_ATHLETE_RADIUS_WORLD;
const HALO_RADIUS = R * 1.34;
const AURA_RADIUS = R * 1.08;
const FIN_BASE_X = R * 0.56;
const FIN_TIP_X = R * 1.72;
const FIN_HALF_Y = R * 0.34;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.065;
const SCALE_DRAGGING = 1.05;
const SCALE_LERP = 0.26;

type TeamPalette = {
  teamColor: number;
  auraColor: number;
  finColor: number;
  finStroke: number;
  bodyFill: number;
  bodyShade: number;
  headFill: number;
  outline: number;
};

function teamPalette(team: MicroAthlete["team"]): TeamPalette {
  if (team === "home") {
    return {
      teamColor: 0x22d3a7,
      auraColor: 0x6ee7b7,
      finColor: 0x34d399,
      finStroke: 0xd1fae5,
      bodyFill: 0xe2e8f0,
      bodyShade: 0x94a3b8,
      headFill: 0xf8fafc,
      outline: 0x0f172a,
    };
  }
  return {
    teamColor: 0xf97316,
    auraColor: 0xfb923c,
    finColor: 0xfb923c,
    finStroke: 0xffedd5,
    bodyFill: 0xffedd5,
    bodyShade: 0xfca5a5,
    headFill: 0xfffbeb,
    outline: 0x7c2d12,
  };
}

/**
 * Simple upright human-like silhouette with slight forward lean (+x).
 */
function drawSilhouette(g: Graphics, palette: TeamPalette): void {
  g.clear();
  g.moveTo(-0.3 * R, 0.82 * R);
  g.lineTo(-0.2 * R, 0.22 * R);
  g.quadraticCurveTo(-0.12 * R, -0.16 * R, 0.18 * R, -0.36 * R);
  g.quadraticCurveTo(0.45 * R, -0.12 * R, 0.5 * R, 0.24 * R);
  g.lineTo(0.36 * R, 0.86 * R);
  g.lineTo(0.1 * R, 0.92 * R);
  g.lineTo(-0.08 * R, 0.9 * R);
  g.closePath();
  g.fill({ color: palette.bodyFill, alpha: 0.96 });
  g.stroke({
    width: 0.18,
    color: palette.outline,
    alpha: 0.45,
    join: "round",
    cap: "round",
  });

  g
    .circle(0.22 * R, -0.56 * R, 0.24 * R)
    .fill({ color: palette.headFill, alpha: 0.98 })
    .stroke({ width: 0.12, color: palette.outline, alpha: 0.38 });

  g
    .ellipse(0.18 * R, 0.26 * R, 0.32 * R, 0.52 * R)
    .fill({ color: palette.bodyShade, alpha: 0.22 });
}

function drawHalo(g: Graphics, palette: TeamPalette): void {
  g.clear();
  g.circle(0, 0, HALO_RADIUS).fill({ color: palette.teamColor, alpha: 0.3 });
  g.circle(0, 0, HALO_RADIUS * 0.7).fill({ color: palette.teamColor, alpha: 0.2 });
  g.circle(0, 0, HALO_RADIUS * 0.46).fill({ color: 0xffffff, alpha: 0.08 });
}

function drawAura(g: Graphics, palette: TeamPalette, selected: boolean, dragging: boolean): void {
  g.clear();
  const alpha = dragging ? 0.95 : selected ? 0.88 : 0.8;
  g.circle(0, 0, AURA_RADIUS).stroke({
    width: 0.22,
    color: palette.auraColor,
    alpha,
  });
  g.circle(0, 0, AURA_RADIUS + 0.22).stroke({
    width: 0.1,
    color: 0xffffff,
    alpha: selected ? 0.58 : 0.34,
  });
}

function drawDirectionalFin(g: Graphics, palette: TeamPalette): void {
  g.clear();
  g
    .moveTo(FIN_BASE_X, -FIN_HALF_Y)
    .lineTo(FIN_BASE_X, FIN_HALF_Y)
    .lineTo(FIN_TIP_X, 0)
    .closePath()
    .fill({ color: palette.finColor, alpha: 0.9 });

  g
    .moveTo(FIN_BASE_X, -FIN_HALF_Y)
    .lineTo(FIN_BASE_X, FIN_HALF_Y)
    .lineTo(FIN_TIP_X, 0)
    .closePath()
    .stroke({
      width: 0.14,
      color: palette.finStroke,
      alpha: 0.72,
      join: "round",
    });
}

export type MicroAthleteView = {
  container: Container;
  sync: (
    athlete: MicroAthlete,
    selected: boolean,
    dragging: boolean,
  ) => boolean;
  dispose: () => void;
};

/**
 * Premium 2.5D micro-athlete token.
 * Layers: halo, aura ring, directional fin, upright silhouette.
 */
export function createMicroAthleteView(): MicroAthleteView {
  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";
  container.cursor = "pointer";

  const halo = new Graphics();
  halo.zIndex = 0;
  // Keep cache disabled in Pixi v8 path to avoid unstable headless/preview draws.
  halo.cacheAsBitmap = false;

  const aura = new Graphics();
  aura.zIndex = 1;
  // Keep cache disabled in Pixi v8 path to avoid unstable headless/preview draws.
  aura.cacheAsBitmap = false;

  const directionalFinRoot = new Container();
  directionalFinRoot.zIndex = 2;
  directionalFinRoot.cacheAsBitmap = false;
  const directionalFin = new Graphics();
  directionalFin.cacheAsBitmap = false;
  directionalFinRoot.addChild(directionalFin);

  const silhouette = new Graphics();
  silhouette.zIndex = 3;
  silhouette.cacheAsBitmap = false;

  container.addChild(halo);
  container.addChild(aura);
  container.addChild(directionalFinRoot);
  container.addChild(silhouette);

  const hitRadius = Math.max(MICRO_ATHLETE_HIT_RADIUS_WORLD, HALO_RADIUS * 2);
  container.hitArea = new Circle(0, 0, hitRadius);

  let palette = teamPalette("home");
  let lastTeam: MicroAthlete["team"] = "home";
  let lastSelected = false;
  let lastDragging = false;

  const redrawStaticLayers = (team: MicroAthlete["team"]) => {
    palette = teamPalette(team);
    drawHalo(halo, palette);
    drawDirectionalFin(directionalFin, palette);
    drawSilhouette(silhouette, palette);
  };

  const redrawAuraLayer = (selected: boolean, dragging: boolean) => {
    drawAura(aura, palette, selected, dragging);
  };

  redrawStaticLayers("home");
  redrawAuraLayer(false, false);

  const sync = (
    athlete: MicroAthlete,
    selected: boolean,
    dragging: boolean,
  ): boolean => {
    const { x, y } = boardNormToWorld(athlete.nx, athlete.ny);
    container.position.set(x, y);
    directionalFinRoot.rotation = athlete.headingRad;

    if (lastTeam !== athlete.team) {
      lastTeam = athlete.team;
      redrawStaticLayers(athlete.team);
      redrawAuraLayer(selected, dragging);
      lastSelected = selected;
      lastDragging = dragging;
    }

    if (lastSelected !== selected || lastDragging !== dragging) {
      lastSelected = selected;
      lastDragging = dragging;
      redrawAuraLayer(selected, dragging);
    }

    const baseTarget = dragging
      ? SCALE_DRAGGING
      : selected
        ? SCALE_SELECTED
        : SCALE_IDLE;
    const t = performance.now() * 0.001;
    const idleBreath =
      dragging || selected ? 0.006 * Math.sin(t * 1.15) : 0.016 * Math.sin(t * 1.05);
    const scaleTarget = baseTarget * (1 + idleBreath);
    const s = container.scale.x;
    const next = s + (scaleTarget - s) * SCALE_LERP;
    container.scale.set(next);

    container.zIndex = selected ? 120 : 0;

    return Math.abs(next - scaleTarget) > 0.004;
  };

  return {
    container,
    sync,
    dispose: () => {
      container.destroy({ children: true });
    },
  };
}
