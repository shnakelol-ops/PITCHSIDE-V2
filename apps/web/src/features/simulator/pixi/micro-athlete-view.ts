import { Circle, Container, Graphics } from "pixi.js";

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
  type JerseyTokenPalette,
  type JerseyTokenRenderer,
} from "@src/features/simulator/pixi/jersey-token-renderer";

const R = MICRO_ATHLETE_RADIUS_WORLD;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.055;
const SCALE_DRAGGING = 1.075;
const SCALE_ACTIVE = 1.015;
const SCALE_LERP = 0.24;

/**
 * Minimal, bulletproof fallback marker used when the premium jersey-token
 * renderer throws during create or sync (e.g. a Pixi v8 Text/TextStyle
 * incompatibility inside the Vercel production bundle). We draw a team-coloured
 * circle with a selection ring — no Text, no gradients, no cached textures —
 * so a jersey-token failure never blanks the whole pitch. Selection + drag
 * keep working because the returned container satisfies the same contract.
 */
function buildFallbackToken(): JerseyTokenRenderer {
  const container = new Container();
  container.sortableChildren = true;

  const body = new Graphics();
  body.zIndex = 2;
  container.addChild(body);

  const ring = new Graphics();
  ring.zIndex = 3;
  ring.visible = false;
  container.addChild(ring);

  const badgeAnchor = new Container();
  badgeAnchor.zIndex = 5;
  container.addChild(badgeAnchor);

  let lastPrimary = Number.NaN;
  let lastOutline = Number.NaN;
  let lastState = -1;

  return {
    container,
    badgeAnchor,
    sync: (opts) => {
      const palette: JerseyTokenPalette = opts.palette;
      if (
        palette.primaryColor !== lastPrimary ||
        palette.outlineColor !== lastOutline
      ) {
        lastPrimary = palette.primaryColor;
        lastOutline = palette.outlineColor;
        body
          .clear()
          .circle(0, 0, R)
          .fill({ color: palette.primaryColor, alpha: 1 })
          .stroke({
            width: 0.2,
            color: palette.outlineColor,
            alpha: 0.6,
          });
      }
      const nextState = opts.dragging ? 2 : opts.selected ? 1 : 0;
      if (nextState !== lastState) {
        lastState = nextState;
        ring.clear();
        ring.visible = nextState > 0;
        if (nextState > 0) {
          ring.circle(0, 0, R * 1.28).stroke({
            width: nextState === 2 ? 0.24 : 0.2,
            color: palette.glowColor,
            alpha: nextState === 2 ? 0.5 : 0.36,
          });
        }
      }
      return false;
    },
    dispose: () => {
      try {
        container.destroy({ children: true });
      } catch {
        /* best-effort */
      }
    },
  };
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

/** Premium tactical jersey token view used by simulator player markers. */
export function createMicroAthleteView(): MicroAthleteView {
  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";
  container.cursor = "pointer";

  let token: JerseyTokenRenderer;
  let tokenDegraded = false;
  try {
    token = createJerseyTokenRenderer(R);
  } catch (err) {
    console.warn(
      "[simulator] jersey-token renderer create failed; using circle fallback",
      err,
    );
    token = buildFallbackToken();
    tokenDegraded = true;
  }
  container.addChild(token.container);

  const hitRadius = Math.max(MICRO_ATHLETE_HIT_RADIUS_WORLD, R * 2);
  container.hitArea = new Circle(0, 0, hitRadius);

  let paletteCache: ReturnType<typeof resolveJerseyTokenPalette> | null = null;
  let palettePrimary = Number.NaN;
  let paletteSecondary = Number.NaN;
  let paletteAccent = Number.NaN;
  let paletteNumber = Number.NaN;
  let numberLabelCache = "";
  let numberKey: number | string | undefined = undefined;

  const sync = (
    athlete: MicroAthlete,
    selected: boolean,
    dragging: boolean,
  ): boolean => {
    const nowMs = performance.now();
    const { x, y } = boardNormToWorld(athlete.nx, athlete.ny);
    container.position.set(x, y);

    const active = false;

    const style = athlete.jerseyStyle;
    const stylePrimary = style?.primaryColor;
    const styleSecondary = style?.secondaryColor;
    const styleAccent = style?.accentColor;
    const styleNumber = style?.numberColor;
    if (
      paletteCache == null ||
      stylePrimary !== palettePrimary ||
      styleSecondary !== paletteSecondary ||
      styleAccent !== paletteAccent ||
      styleNumber !== paletteNumber
    ) {
      palettePrimary = stylePrimary ?? Number.NaN;
      paletteSecondary = styleSecondary ?? Number.NaN;
      paletteAccent = styleAccent ?? Number.NaN;
      paletteNumber = styleNumber ?? Number.NaN;
      paletteCache = resolveJerseyTokenPalette(athlete);
    }

    if (athlete.jerseyNumber !== numberKey) {
      numberKey = athlete.jerseyNumber;
      numberLabelCache = resolveJerseyNumberLabel(athlete);
    }

    let tokenNeedsFrame = false;
    try {
      tokenNeedsFrame = token.sync({
        headingRad: athlete.headingRad,
        numberLabel: numberLabelCache,
        palette: paletteCache,
        selected,
        dragging,
        active,
        nowMs,
      });
    } catch (err) {
      if (!tokenDegraded) {
        console.warn(
          "[simulator] jersey-token sync failed; swapping to circle fallback",
          err,
        );
        try {
          container.removeChild(token.container);
          token.dispose();
        } catch {
          /* best-effort cleanup of the broken token */
        }
        token = buildFallbackToken();
        tokenDegraded = true;
        container.addChild(token.container);
        try {
          tokenNeedsFrame = token.sync({
            headingRad: athlete.headingRad,
            numberLabel: numberLabelCache,
            palette: paletteCache,
            selected,
            dragging,
            active,
            nowMs,
          });
        } catch {
          /* fallback is deliberately trivial; ignore if it still fails */
        }
      }
    }

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
