import { Circle, Container } from "pixi.js";

import { boardNormToWorld } from "@src/lib/pitch-coordinates";
import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";
import {
  MICRO_ATHLETE_HIT_RADIUS_WORLD,
  MICRO_ATHLETE_RADIUS_WORLD,
} from "@src/features/simulator/model/micro-athlete";
import {
  createJerseyTokenRenderer,
  resolveJerseyNumberLabel,
  resolveJerseyTokenPalette,
} from "@src/features/simulator/pixi/jersey-token-renderer";

const R = MICRO_ATHLETE_RADIUS_WORLD;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.055;
const SCALE_DRAGGING = 1.075;
const SCALE_ACTIVE = 1.015;
const SCALE_LERP = 0.24;
const ACTIVE_MOVE_THRESHOLD2 = 2.2e-5;
const ACTIVE_HEADING_THRESHOLD = 0.05;
const ACTIVE_HOLD_MS = 260;

export type MicroAthleteView = {
  container: Container;
  sync: (
    athlete: MicroAthlete,
    selected: boolean,
    dragging: boolean,
  ) => boolean;
  dispose: () => void;
};

/** Premium tactical jersey token view used by simulator player markers. */
export function createMicroAthleteView(): MicroAthleteView {
  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";
  container.cursor = "pointer";

  const token = createJerseyTokenRenderer(R);
  container.addChild(token.container);

  const hitRadius = Math.max(MICRO_ATHLETE_HIT_RADIUS_WORLD, R * 2);
  container.hitArea = new Circle(0, 0, hitRadius);

  let lastNx: number | null = null;
  let lastNy: number | null = null;
  let lastHeading = 0;
  let activeUntilMs = 0;

  const sync = (
    athlete: MicroAthlete,
    selected: boolean,
    dragging: boolean,
  ): boolean => {
    const nowMs = performance.now();
    const { x, y } = boardNormToWorld(athlete.nx, athlete.ny);
    container.position.set(x, y);

    if (lastNx != null && lastNy != null) {
      const dx = athlete.nx - lastNx;
      const dy = athlete.ny - lastNy;
      const dHeading = Math.abs(athlete.headingRad - lastHeading);
      if (
        dx * dx + dy * dy > ACTIVE_MOVE_THRESHOLD2 ||
        dHeading > ACTIVE_HEADING_THRESHOLD
      ) {
        activeUntilMs = nowMs + ACTIVE_HOLD_MS;
      }
    }
    lastNx = athlete.nx;
    lastNy = athlete.ny;
    lastHeading = athlete.headingRad;

    const movingActive = nowMs < activeUntilMs;
    const active = movingActive && !dragging;

    const tokenNeedsFrame = token.sync({
      headingRad: athlete.headingRad,
      numberLabel: resolveJerseyNumberLabel(athlete),
      palette: resolveJerseyTokenPalette(athlete),
      selected,
      dragging,
      active,
      nowMs,
    });

    const baseTarget = dragging
      ? SCALE_DRAGGING
      : selected
        ? SCALE_SELECTED
        : active
          ? SCALE_ACTIVE
          : SCALE_IDLE;
    const s = container.scale.x;
    const next = s + (baseTarget - s) * SCALE_LERP;
    container.scale.set(next);

    container.zIndex = selected ? 120 : 0;

    return tokenNeedsFrame || Math.abs(next - baseTarget) > 0.003;
  };

  return {
    container,
    sync,
    dispose: () => {
      container.destroy({ children: true });
    },
  };
}
