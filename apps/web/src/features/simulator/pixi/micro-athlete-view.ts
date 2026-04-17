import { Circle, Container, Graphics } from "pixi.js";

import { boardNormToWorld } from "@src/lib/pitch-coordinates";
import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";
import {
  MICRO_ATHLETE_HIT_RADIUS_WORLD,
} from "@src/features/simulator/model/micro-athlete";
import { JerseyToken } from "@src/features/simulator/pixi/JerseyToken";

const BODY_SCALE = 0.108;
const AURA_RADIUS = 3.08;
const FIN_BASE_X = 1.2;
const FIN_TIP_X = 4.2;
const FIN_HALF_Y = 0.88;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.065;
const SCALE_DRAGGING = 1.05;
const SCALE_LERP = 0.26;

type TeamPalette = {
  teamColor: number;
  auraColor: number;
  finColor: number;
  finStroke: number;
};

function teamPalette(team: MicroAthlete["team"]): TeamPalette {
  if (team === "home") {
    return {
      teamColor: 0x22d3a7,
      auraColor: 0x6ee7b7,
      finColor: 0x34d399,
      finStroke: 0xd1fae5,
    };
  }
  return {
    teamColor: 0xf97316,
    auraColor: 0xfb923c,
    finColor: 0xfb923c,
    finStroke: 0xffedd5,
  };
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
 * Premium jersey token view.
 * Layers: jersey token, aura ring, directional fin.
 */
export function createMicroAthleteView(): MicroAthleteView {
  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";
  container.cursor = "pointer";

  const jersey = new JerseyToken("athlete", "Player", 0x22d3a7, "solid");
  jersey.scale.set(BODY_SCALE);

  const aura = new Graphics();
  aura.zIndex = 1;

  const directionalFinRoot = new Container();
  directionalFinRoot.zIndex = 2;
  const directionalFin = new Graphics();
  directionalFinRoot.addChild(directionalFin);
  jersey.zIndex = 3;
  container.addChild(jersey);
  container.addChild(aura);
  container.addChild(directionalFinRoot);

  const hitRadius = Math.max(MICRO_ATHLETE_HIT_RADIUS_WORLD, AURA_RADIUS * 1.55);
  container.hitArea = new Circle(0, 0, hitRadius);

  let palette = teamPalette("home");
  let lastTeam: MicroAthlete["team"] = "home";
  let lastSelected = false;
  let lastDragging = false;

  const labelFromId = (id: string) => {
    const numeric = id.match(/\d+/)?.[0];
    return numeric ? `P${numeric}` : id.slice(0, 3).toUpperCase();
  };

  const redrawStaticLayers = (athlete: MicroAthlete) => {
    const team = athlete.team;
    palette = teamPalette(team);
    jersey.setIdentity(athlete.id, labelFromId(athlete.id));
    jersey.setTeamStyle(palette.teamColor, team === "away" ? "slash" : "solid");
    drawDirectionalFin(directionalFin, palette);
  };

  const redrawAuraLayer = (selected: boolean, dragging: boolean) => {
    drawAura(aura, palette, selected, dragging);
  };

  redrawStaticLayers({
    id: "athlete",
    nx: 0,
    ny: 0,
    headingRad: 0,
    team: "home",
  });
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
      redrawStaticLayers(athlete);
      redrawAuraLayer(selected, dragging);
      lastSelected = selected;
      lastDragging = dragging;
    }
    if (jersey.id !== athlete.id) {
      redrawStaticLayers(athlete);
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
