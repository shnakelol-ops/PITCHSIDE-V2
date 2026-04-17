import { Circle, Container, Graphics } from "pixi.js";

import { boardNormToWorld } from "@src/lib/pitch-coordinates";
import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";
import {
  MICRO_ATHLETE_HIT_RADIUS_WORLD,
  MICRO_ATHLETE_RADIUS_WORLD,
} from "@src/features/simulator/model/micro-athlete";

const R = MICRO_ATHLETE_RADIUS_WORLD;
const HALO_RADIUS = R * 1.42;
const AURA_RADIUS = R * 1.14;
const BODY_CENTER_X = R * 0.06;
const BODY_CENTER_Y = R * 0.1;
const BODY_RADIUS_X = R * 0.56;
const BODY_RADIUS_Y = R * 0.74;

const SHADOW_RADIUS_X = R * 0.92;
const SHADOW_RADIUS_Y = R * 0.36;
const SHADOW_OFFSET_Y = R * 0.86;

const INDICATOR_BASE_X = R * 0.54;
const INDICATOR_TIP_X = R * 1.72;
const INDICATOR_HALF_Y = R * 0.26;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.064;
const SCALE_DRAGGING = 1.05;
const SCALE_LERP = 0.24;

type TeamPalette = {
  halo: number;
  aura: number;
  jerseyTop: number;
  jerseyMid: number;
  jerseyBottom: number;
  jerseyTrim: number;
  skin: number;
  shadow: number;
  indicator: number;
  indicatorStroke: number;
  outline: number;
};

function teamPalette(team: MicroAthlete["team"]): TeamPalette {
  if (team === "home") {
    return {
      halo: 0x22d3a7,
      aura: 0x6ee7b7,
      jerseyTop: 0xc7f9eb,
      jerseyMid: 0x4fd1b5,
      jerseyBottom: 0x0f766e,
      jerseyTrim: 0xf0fdfa,
      skin: 0xf8fafc,
      shadow: 0x062019,
      indicator: 0x34d399,
      indicatorStroke: 0xf0fdf4,
      outline: 0x042f2e,
    };
  }
  return {
    halo: 0xfb923c,
    aura: 0xfdba74,
    jerseyTop: 0xffedd5,
    jerseyMid: 0xfb923c,
    jerseyBottom: 0xc2410c,
    jerseyTrim: 0xfffbeb,
    skin: 0xfff7ed,
    shadow: 0x2f1304,
    indicator: 0xfb923c,
    indicatorStroke: 0xffedd5,
    outline: 0x7c2d12,
  };
}

function drawSoftShadow(g: Graphics, palette: TeamPalette, selected: boolean, dragging: boolean): void {
  g.clear();
  const alpha = dragging ? 0.16 : selected ? 0.19 : 0.14;
  g
    .ellipse(0, SHADOW_OFFSET_Y, SHADOW_RADIUS_X, SHADOW_RADIUS_Y)
    .fill({ color: palette.shadow, alpha });
  g
    .ellipse(0, SHADOW_OFFSET_Y, SHADOW_RADIUS_X * 0.62, SHADOW_RADIUS_Y * 0.6)
    .fill({ color: 0x000000, alpha: alpha * 0.58 });
}

function drawHalo(g: Graphics, palette: TeamPalette): void {
  g.clear();
  g.circle(0, 0, HALO_RADIUS).fill({ color: palette.halo, alpha: 0.2 });
  g.circle(0, 0, HALO_RADIUS * 0.72).fill({ color: palette.halo, alpha: 0.16 });
  g.circle(0, 0, HALO_RADIUS * 0.48).fill({ color: 0xffffff, alpha: 0.075 });
}

function drawAura(g: Graphics, palette: TeamPalette, selected: boolean, dragging: boolean): void {
  g.clear();
  const auraAlpha = dragging ? 0.95 : selected ? 0.86 : 0.72;
  const outerAlpha = dragging ? 0.62 : selected ? 0.5 : 0.28;
  g
    .circle(0, 0, AURA_RADIUS)
    .stroke({ width: 0.22, color: palette.aura, alpha: auraAlpha });
  g
    .circle(0, 0, AURA_RADIUS + 0.22)
    .stroke({ width: 0.1, color: 0xffffff, alpha: outerAlpha });
}

/**
 * Layered fills approximate a subtle vertical jersey gradient while staying vector-fast.
 */
function drawAthleteBody(g: Graphics, palette: TeamPalette): void {
  g.clear();
  g
    .ellipse(BODY_CENTER_X, BODY_CENTER_Y, BODY_RADIUS_X, BODY_RADIUS_Y)
    .fill({ color: palette.jerseyBottom, alpha: 0.94 });
  g
    .ellipse(BODY_CENTER_X, BODY_CENTER_Y - R * 0.04, BODY_RADIUS_X * 0.95, BODY_RADIUS_Y * 0.72)
    .fill({ color: palette.jerseyMid, alpha: 0.94 });
  g
    .ellipse(BODY_CENTER_X, BODY_CENTER_Y - R * 0.34, BODY_RADIUS_X * 0.82, BODY_RADIUS_Y * 0.34)
    .fill({ color: palette.jerseyTop, alpha: 0.94 });
  g
    .ellipse(BODY_CENTER_X, BODY_CENTER_Y + R * 0.26, BODY_RADIUS_X * 0.84, BODY_RADIUS_Y * 0.3)
    .fill({ color: palette.jerseyBottom, alpha: 0.4 });

  g
    .moveTo(-0.36 * R, 0.84 * R)
    .lineTo(-0.26 * R, 0.22 * R)
    .quadraticCurveTo(-0.16 * R, -0.18 * R, 0.14 * R, -0.4 * R)
    .quadraticCurveTo(0.52 * R, -0.08 * R, 0.54 * R, 0.28 * R)
    .lineTo(0.38 * R, 0.86 * R)
    .lineTo(0.08 * R, 0.92 * R)
    .lineTo(-0.16 * R, 0.9 * R)
    .closePath()
    .stroke({ width: 0.16, color: palette.outline, alpha: 0.5, join: "round", cap: "round" });

  g
    .ellipse(BODY_CENTER_X + R * 0.06, BODY_CENTER_Y - R * 0.22, BODY_RADIUS_X * 0.34, BODY_RADIUS_Y * 0.26)
    .fill({ color: palette.jerseyTrim, alpha: 0.18 });

  g
    .circle(0.24 * R, -0.58 * R, 0.24 * R)
    .fill({ color: palette.skin, alpha: 0.98 })
    .stroke({ width: 0.12, color: palette.outline, alpha: 0.38 });
}

function drawDirectionalIndicator(g: Graphics, palette: TeamPalette): void {
  g.clear();
  g
    .moveTo(INDICATOR_BASE_X, -INDICATOR_HALF_Y)
    .lineTo(INDICATOR_BASE_X, INDICATOR_HALF_Y)
    .lineTo(INDICATOR_TIP_X, 0)
    .closePath()
    .fill({ color: palette.indicator, alpha: 0.9 });
  g
    .moveTo(INDICATOR_BASE_X, -INDICATOR_HALF_Y)
    .lineTo(INDICATOR_BASE_X, INDICATOR_HALF_Y)
    .lineTo(INDICATOR_TIP_X, 0)
    .closePath()
    .stroke({
      width: 0.14,
      color: palette.indicatorStroke,
      alpha: 0.72,
      join: "round",
      cap: "round",
    });
}

function drawFallbackMarker(g: Graphics, team: MicroAthlete["team"], selected: boolean): void {
  const fill = team === "home" ? 0x22d3a7 : 0xfb923c;
  const stroke = team === "home" ? 0x0f766e : 0x9a3412;
  g.clear();
  g.circle(0, 0, R * 0.95).fill({ color: fill, alpha: 0.95 });
  g
    .circle(0, 0, R * 0.95)
    .stroke({ width: selected ? 0.28 : 0.2, color: stroke, alpha: 0.88 });
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
 * Premium Athlete Token V2 with runtime fallback marker.
 * If any draw/sync step fails, we switch to a simple, stable dot marker.
 */
export function createMicroAthleteView(): MicroAthleteView {
  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";
  container.cursor = "pointer";

  const shadow = new Graphics();
  shadow.zIndex = 0;
  const halo = new Graphics();
  halo.zIndex = 1;
  const aura = new Graphics();
  aura.zIndex = 2;
  const directionalRoot = new Container();
  directionalRoot.zIndex = 3;
  const directionalIndicator = new Graphics();
  directionalRoot.addChild(directionalIndicator);
  const body = new Graphics();
  body.zIndex = 4;

  const fallbackShadow = new Graphics();
  fallbackShadow.zIndex = 0;
  const fallbackBody = new Graphics();
  fallbackBody.zIndex = 1;
  const fallbackNose = new Graphics();
  fallbackNose.zIndex = 2;

  const premiumLayers: readonly (Container | Graphics)[] = [
    shadow,
    halo,
    aura,
    directionalRoot,
    body,
  ];
  const fallbackLayers: readonly Graphics[] = [
    fallbackShadow,
    fallbackBody,
    fallbackNose,
  ];

  const hitRadius = Math.max(MICRO_ATHLETE_HIT_RADIUS_WORLD, HALO_RADIUS * 2);
  container.hitArea = new Circle(0, 0, hitRadius);

  let fallbackMode = false;
  let palette = teamPalette("home");
  let lastTeam: MicroAthlete["team"] = "home";
  let lastSelected = false;
  let lastDragging = false;

  const installPremiumLayers = () => {
    container.removeChildren();
    for (const child of premiumLayers) {
      container.addChild(child);
    }
  };

  const installFallbackLayers = () => {
    if (fallbackMode) return;
    fallbackMode = true;
    container.removeChildren();
    for (const child of fallbackLayers) {
      container.addChild(child);
    }
  };

  const redrawPremiumStatic = (team: MicroAthlete["team"]) => {
    palette = teamPalette(team);
    drawHalo(halo, palette);
    drawDirectionalIndicator(directionalIndicator, palette);
    drawAthleteBody(body, palette);
  };

  const redrawPremiumState = (selected: boolean, dragging: boolean) => {
    drawSoftShadow(shadow, palette, selected, dragging);
    drawAura(aura, palette, selected, dragging);
  };

  const redrawFallback = (
    team: MicroAthlete["team"],
    selected: boolean,
    dragging: boolean,
  ) => {
    const shadowAlpha = dragging ? 0.16 : selected ? 0.18 : 0.13;
    fallbackShadow.clear();
    fallbackShadow
      .ellipse(0, SHADOW_OFFSET_Y, SHADOW_RADIUS_X * 0.84, SHADOW_RADIUS_Y * 0.62)
      .fill({ color: 0x000000, alpha: shadowAlpha });
    drawFallbackMarker(fallbackBody, team, selected);
    const fill = team === "home" ? 0x99f6e4 : 0xffedd5;
    fallbackNose.clear();
    fallbackNose
      .moveTo(R * 0.58, -R * 0.16)
      .lineTo(R * 0.58, R * 0.16)
      .lineTo(R * 1.26, 0)
      .closePath()
      .fill({ color: fill, alpha: 0.95 });
  };

  try {
    installPremiumLayers();
    redrawPremiumStatic("home");
    redrawPremiumState(false, false);
  } catch (err) {
    console.error("[simulator] premium token init failed, using fallback marker", err);
    installFallbackLayers();
    redrawFallback("home", false, false);
  }

  const sync = (
    athlete: MicroAthlete,
    selected: boolean,
    dragging: boolean,
  ): boolean => {
    const { x, y } = boardNormToWorld(athlete.nx, athlete.ny);
    container.position.set(x, y);

    try {
      if (!fallbackMode) {
        directionalRoot.rotation = athlete.headingRad;

        if (lastTeam !== athlete.team) {
          lastTeam = athlete.team;
          redrawPremiumStatic(athlete.team);
          redrawPremiumState(selected, dragging);
          lastSelected = selected;
          lastDragging = dragging;
        }
        if (lastSelected !== selected || lastDragging !== dragging) {
          lastSelected = selected;
          lastDragging = dragging;
          redrawPremiumState(selected, dragging);
        }
      } else {
        if (
          lastTeam !== athlete.team ||
          lastSelected !== selected ||
          lastDragging !== dragging
        ) {
          lastTeam = athlete.team;
          lastSelected = selected;
          lastDragging = dragging;
          redrawFallback(athlete.team, selected, dragging);
        }
        fallbackNose.rotation = athlete.headingRad;
      }
    } catch (err) {
      console.error("[simulator] premium token render failed, switching to fallback marker", err);
      installFallbackLayers();
      redrawFallback(athlete.team, selected, dragging);
      fallbackNose.rotation = athlete.headingRad;
      lastTeam = athlete.team;
      lastSelected = selected;
      lastDragging = dragging;
    }

    const baseTarget = dragging
      ? SCALE_DRAGGING
      : selected
        ? SCALE_SELECTED
        : SCALE_IDLE;
    const t = performance.now() * 0.001;
    const idleBreath =
      dragging || selected ? 0.0058 * Math.sin(t * 1.2) : 0.014 * Math.sin(t * 1.04);
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
