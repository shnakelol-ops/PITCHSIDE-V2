import { Circle, Container, FillGradient, Graphics } from "pixi.js";

import { boardNormToWorld } from "@src/lib/pitch-coordinates";
import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";
import {
  MICRO_ATHLETE_HIT_RADIUS_WORLD,
  MICRO_ATHLETE_RADIUS_WORLD,
} from "@src/features/simulator/model/micro-athlete";

const R = MICRO_ATHLETE_RADIUS_WORLD;
const DIR_TIP = R * 1.62;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.065;
const SCALE_DRAGGING = 1.05;
const SCALE_LERP = 0.26;

function teamBodyGradient(team: MicroAthlete["team"]): FillGradient {
  if (team === "home") {
    return new FillGradient({
      type: "radial",
      center: { x: 0.4, y: 0.32 },
      innerRadius: 0,
      outerRadius: 1,
      outerCenter: { x: 0.4, y: 0.32 },
      textureSpace: "local",
      colorStops: [
        { offset: 0, color: "#ecfdf8" },
        { offset: 0.22, color: "#6ee7c5" },
        { offset: 0.55, color: "#0f9a7a" },
        { offset: 1, color: "#064e45" },
      ],
    });
  }
  return new FillGradient({
    type: "radial",
    center: { x: 0.4, y: 0.32 },
    innerRadius: 0,
    outerRadius: 1,
    outerCenter: { x: 0.4, y: 0.32 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: "#fffbeb" },
      { offset: 0.22, color: "#fcd34d" },
      { offset: 0.55, color: "#c2410c" },
      { offset: 1, color: "#7c2d12" },
    ],
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
 * Premium micro-athlete: turf-contact shadow, lit body, directional wedge, selection halo.
 */
export function createMicroAthleteView(): MicroAthleteView {
  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";
  container.cursor = "pointer";

  const shadow = new Graphics();
  shadow.zIndex = 0;

  const body = new Graphics();
  body.zIndex = 1;

  const direction = new Graphics();
  direction.zIndex = 2;

  const selection = new Graphics();
  selection.zIndex = 3;

  container.addChild(shadow);
  container.addChild(body);
  container.addChild(direction);
  container.addChild(selection);

  let bodyGradient: FillGradient | null = null;

  const hitRadius = MICRO_ATHLETE_HIT_RADIUS_WORLD;
  container.hitArea = new Circle(0, 0, hitRadius);

  const redrawBody = (team: MicroAthlete["team"]) => {
    bodyGradient?.destroy();
    bodyGradient = teamBodyGradient(team);
    body.clear();
    body.circle(0, 0, R).fill(bodyGradient);
    body.circle(0, 0, R).stroke({
      width: 0.38,
      color: "rgba(255,255,255,0.42)",
    });
    body.circle(0, 0, R).stroke({
      width: 0.12,
      color: "rgba(0,0,0,0.18)",
    });
  };

  const redrawShadow = () => {
    shadow.clear();
    shadow
      .ellipse(0.38, 0.58, R * 1.14, R * 0.68)
      .fill({ color: 0x020617, alpha: 0.14 });
    shadow
      .ellipse(0.32, 0.48, R * 0.55, R * 0.36)
      .fill({ color: 0x020617, alpha: 0.22 });
  };

  const redrawDirection = () => {
    direction.clear();
    const yHalf = R * 0.34;
    const xBase = R * 0.72;
    direction
      .moveTo(xBase, -yHalf)
      .lineTo(xBase, yHalf)
      .lineTo(DIR_TIP, 0)
      .closePath()
      .fill({ color: "rgba(15, 23, 42, 0.82)" });
    direction
      .moveTo(xBase, -yHalf)
      .lineTo(xBase, yHalf)
      .lineTo(DIR_TIP, 0)
      .closePath()
      .stroke({
        width: 0.24,
        color: "rgba(255,255,255,0.55)",
        join: "round",
      });
    direction
      .moveTo(R * 0.12, 0)
      .lineTo(xBase + 0.04, 0)
      .stroke({
        width: 0.16,
        color: "rgba(255,255,255,0.26)",
        cap: "round",
      });
  };

  redrawShadow();
  redrawBody("home");
  redrawDirection();

  let lastTeam: MicroAthlete["team"] = "home";
  let lastSelectionDrawn: boolean | null = null;

  const sync = (
    athlete: MicroAthlete,
    selected: boolean,
    dragging: boolean,
  ): boolean => {
    const { x, y } = boardNormToWorld(athlete.nx, athlete.ny);
    container.position.set(x, y);
    container.rotation = athlete.headingRad;

    if (lastTeam !== athlete.team) {
      lastTeam = athlete.team;
      redrawBody(athlete.team);
    }

    if (lastSelectionDrawn !== selected) {
      lastSelectionDrawn = selected;
      selection.clear();
      if (selected) {
        selection
          .circle(0, 0, R + 1.12)
          .stroke({ width: 0.55, color: "rgba(16, 185, 129, 0.22)" });
        selection
          .circle(0, 0, R + 0.95)
          .stroke({ width: 0.38, color: "rgba(52, 211, 153, 0.75)" });
        selection
          .circle(0, 0, R + 0.76)
          .stroke({ width: 0.14, color: "rgba(255,255,255,0.55)" });
      }
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
      bodyGradient?.destroy();
      bodyGradient = null;
      container.destroy({ children: true });
    },
  };
}
