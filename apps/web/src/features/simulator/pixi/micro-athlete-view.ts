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
const FRONT_BEACON_X = R * 0.56;
const FRONT_BEACON_R = R * 0.16;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.065;
const SCALE_DRAGGING = 1.05;
const SCALE_LERP = 0.26;

function teamBodyGradient(team: MicroAthlete["team"]): FillGradient {
  /** Light from forward-above (+x, -y local) — subtle chest/head highlight. */
  if (team === "home") {
    return new FillGradient({
      type: "radial",
      center: { x: 0.48, y: 0.24 },
      innerRadius: 0,
      outerRadius: 1,
      outerCenter: { x: 0.48, y: 0.24 },
      textureSpace: "local",
      colorStops: [
        { offset: 0, color: "#ecfdf5" },
        { offset: 0.28, color: "#6ee7b7" },
        { offset: 0.58, color: "#10b981" },
        { offset: 1, color: "#064e3b" },
      ],
    });
  }
  return new FillGradient({
    type: "radial",
    center: { x: 0.48, y: 0.24 },
    innerRadius: 0,
    outerRadius: 1,
    outerCenter: { x: 0.48, y: 0.24 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: "#fff7ed" },
      { offset: 0.28, color: "#fdba74" },
      { offset: 0.58, color: "#f97316" },
      { offset: 1, color: "#7c2d12" },
    ],
  });
}

/**
 * One closed path: compact teardrop/jersey silhouette (+x = facing).
 */
function drawAthleteSilhouette(g: Graphics, gradient: FillGradient, m: number): void {
  g.moveTo(-0.62 * m, 0);
  g.bezierCurveTo(-0.54 * m, -0.56 * m, 0.22 * m, -0.84 * m, 0.98 * m, 0);
  g.bezierCurveTo(0.22 * m, 0.84 * m, -0.54 * m, 0.56 * m, -0.62 * m, 0);
  g.closePath();
  g.fill(gradient);
  g.stroke({
    width: 0.34,
    color: "rgba(255,255,255,0.38)",
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
 * Micro-athlete token: layered ground shadow, teardrop body, forward beacons.
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
      .ellipse(0.2 * R, 0.66 * R, R * 1.14, R * 0.68)
      .fill({ color: 0x020617, alpha: 0.12 });
    shadow
      .ellipse(0.1 * R, 0.56 * R, R * 0.58, R * 0.34)
      .fill({ color: 0x020617, alpha: 0.2 });
  };

  const redrawDirection = () => {
    direction.clear();
    // Forward-facing cue without triangular glyphs.
    const seamStartX = R * 0.04;
    const seamEndX = R * 0.64;
    direction
      .moveTo(seamStartX, 0)
      .lineTo(seamEndX, 0)
      .stroke({
        width: 0.16,
        color: "rgba(255,255,255,0.26)",
        cap: "round",
      });
    direction
      .circle(FRONT_BEACON_X, 0, FRONT_BEACON_R)
      .fill({ color: "rgba(248,250,252,0.72)" })
      .stroke({
        width: 0.18,
        color: "rgba(15,23,42,0.5)",
        join: "round",
        cap: "round",
      });
    direction
      .circle(FRONT_BEACON_X + FRONT_BEACON_R * 1.48, 0, FRONT_BEACON_R * 0.46)
      .fill({ color: "rgba(248,250,252,0.55)" })
      .stroke({
        width: 0.12,
        color: "rgba(15,23,42,0.4)",
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
