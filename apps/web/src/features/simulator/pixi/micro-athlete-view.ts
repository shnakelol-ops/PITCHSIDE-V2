import { Circle, Container, FillGradient, Graphics } from "pixi.js";

import { boardNormToWorld } from "@src/lib/pitch-coordinates";
import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";
import {
  MICRO_ATHLETE_HIT_RADIUS_WORLD,
  MICRO_ATHLETE_RADIUS_WORLD,
} from "@src/features/simulator/model/micro-athlete";

const R = MICRO_ATHLETE_RADIUS_WORLD;
/** Visual extent ~ max distance from origin for selection halo. */
const R_VIS = R * 1.08;
const DIR_TIP = R * 1.58;
const DIR_X0 = R * 0.62;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.065;
const SCALE_DRAGGING = 1.05;
const SCALE_LERP = 0.26;

function teamBodyGradient(team: MicroAthlete["team"]): FillGradient {
  /** Light from forward-above (+x, -y local) — highlight on chest/head, shade on rear/shield. */
  if (team === "home") {
    return new FillGradient({
      type: "radial",
      center: { x: 0.52, y: 0.26 },
      innerRadius: 0,
      outerRadius: 1,
      outerCenter: { x: 0.52, y: 0.26 },
      textureSpace: "local",
      colorStops: [
        { offset: 0, color: "#f0fdf8" },
        { offset: 0.18, color: "#86efbd" },
        { offset: 0.42, color: "#14b897" },
        { offset: 0.72, color: "#0d8068" },
        { offset: 1, color: "#042f2a" },
      ],
    });
  }
  return new FillGradient({
    type: "radial",
    center: { x: 0.52, y: 0.26 },
    innerRadius: 0,
    outerRadius: 1,
    outerCenter: { x: 0.52, y: 0.26 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: "#fffbeb" },
      { offset: 0.18, color: "#fde047" },
      { offset: 0.42, color: "#ea580c" },
      { offset: 0.72, color: "#9a3412" },
      { offset: 1, color: "#431407" },
    ],
  });
}

/**
 * One closed path: compact head-forward silhouette, tapered shield base (+x = facing).
 */
function drawAthleteSilhouette(g: Graphics, gradient: FillGradient, m: number): void {
  g.moveTo(-0.52 * m, 0.52 * m);
  g.quadraticCurveTo(-0.58 * m, 0.22 * m, -0.5 * m, -0.08 * m);
  g.quadraticCurveTo(-0.44 * m, -0.36 * m, -0.22 * m, -0.46 * m);
  g.quadraticCurveTo(0.08 * m, -0.54 * m, 0.4 * m, -0.44 * m);
  g.quadraticCurveTo(0.68 * m, -0.32 * m, 0.78 * m, -0.04 * m);
  g.quadraticCurveTo(0.86 * m, 0.2 * m, 0.68 * m, 0.38 * m);
  g.quadraticCurveTo(0.4 * m, 0.54 * m, 0.08 * m, 0.58 * m);
  g.quadraticCurveTo(-0.22 * m, 0.58 * m, -0.52 * m, 0.52 * m);
  g.closePath();
  g.fill(gradient);
  g.stroke({
    width: 0.32,
    color: "rgba(255,255,255,0.34)",
    join: "round",
    cap: "round",
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
 * Micro-athlete token: layered ground shadow, silhouette body with radial depth, forward wedge.
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
    drawAthleteSilhouette(body, bodyGradient, R);
  };

  const redrawShadow = () => {
    shadow.clear();
    shadow
      .ellipse(0.18 * R, 0.68 * R, R * 1.22, R * 0.74)
      .fill({ color: 0x020617, alpha: 0.11 });
    shadow
      .ellipse(0.12 * R, 0.58 * R, R * 0.62, R * 0.38)
      .fill({ color: 0x020617, alpha: 0.2 });
    shadow
      .ellipse(0.06 * R, 0.52 * R, R * 0.32, R * 0.2)
      .fill({ color: 0x020617, alpha: 0.26 });
  };

  const redrawDirection = () => {
    direction.clear();
    const yHalf = R * 0.28;
    const xBase = DIR_X0;
    direction
      .moveTo(xBase, -yHalf)
      .lineTo(xBase, yHalf)
      .lineTo(DIR_TIP, 0)
      .closePath()
      .fill({ color: "rgba(15, 23, 42, 0.72)" });
    direction
      .moveTo(xBase, -yHalf)
      .lineTo(xBase, yHalf)
      .lineTo(DIR_TIP, 0)
      .closePath()
      .stroke({
        width: 0.22,
        color: "rgba(255,255,255,0.45)",
        join: "round",
      });
    direction
      .moveTo(R * 0.08, 0)
      .lineTo(xBase + 0.02, 0)
      .stroke({
        width: 0.14,
        color: "rgba(255,255,255,0.22)",
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
          .circle(0, 0, R_VIS + 1.12)
          .stroke({ width: 0.55, color: "rgba(16, 185, 129, 0.22)" });
        selection
          .circle(0, 0, R_VIS + 0.95)
          .stroke({ width: 0.38, color: "rgba(52, 211, 153, 0.75)" });
        selection
          .circle(0, 0, R_VIS + 0.76)
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
