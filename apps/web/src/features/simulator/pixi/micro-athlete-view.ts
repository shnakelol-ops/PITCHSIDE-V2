import { Circle, Container, FillGradient, Graphics } from "pixi.js";

import { boardNormToWorld } from "@src/lib/pitch-coordinates";
import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";
import {
  MICRO_ATHLETE_HIT_RADIUS_WORLD,
  MICRO_ATHLETE_RADIUS_WORLD,
} from "@src/features/simulator/model/micro-athlete";

const R = MICRO_ATHLETE_RADIUS_WORLD;
const TOKEN_RADIUS = R * 1.02;
const CORE_RADIUS = R * 0.86;
const GLOW_RADIUS = R * 1.34;
const SHADOW_Y = R * 0.6;
const SHADOW_RX = R * 1.02;
const SHADOW_RY = R * 0.5;
const NUB_RADIUS = R * 0.2;
const NUB_X = TOKEN_RADIUS + R * 0.02;

const DIGIT_WIDTH = R * 0.66;
const DIGIT_HEIGHT = R * 1.12;
const DIGIT_STROKE = R * 0.18;
const DIGIT_STROKE_SHADOW = DIGIT_STROKE + 0.12;
const DIGIT_GAP = R * 0.18;
const DIGIT_TOP = -DIGIT_HEIGHT * 0.5;
const DIGIT_MID = 0;
const DIGIT_BOTTOM = DIGIT_HEIGHT * 0.5;

const SCALE_IDLE = 1;
const SCALE_SELECTED = 1.065;
const SCALE_DRAGGING = 1.05;
const SCALE_LERP = 0.26;

type TeamPalette = {
  shellTop: string;
  shellBottom: string;
  coreTop: string;
  coreBottom: string;
  ringShade: number;
  glowColor: number;
  nubColor: number;
  numberColor: number;
};

function teamPalette(team: MicroAthlete["team"]): TeamPalette {
  if (team === "home") {
    return {
      shellTop: "#58f2ce",
      shellBottom: "#0f8878",
      coreTop: "#c8fff1",
      coreBottom: "#35c8a8",
      ringShade: 0x0d4b41,
      glowColor: 0x61ffd0,
      nubColor: 0x9fffe5,
      numberColor: 0xfaffff,
    };
  }
  return {
    shellTop: "#ffb36d",
    shellBottom: "#dc5c13",
    coreTop: "#ffe8c9",
    coreBottom: "#ff9a3b",
    ringShade: 0x7f330b,
    glowColor: 0xffc07d,
    nubColor: 0xffe5bd,
    numberColor: 0xfffeff,
  };
}

type SegmentName = "a" | "b" | "c" | "d" | "e" | "f" | "g";

const DIGIT_SEGMENTS: Record<string, readonly SegmentName[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

function segmentEndpoints(segment: SegmentName, offsetX: number) {
  const left = offsetX - DIGIT_WIDTH * 0.5;
  const right = offsetX + DIGIT_WIDTH * 0.5;
  switch (segment) {
    case "a":
      return [left, DIGIT_TOP, right, DIGIT_TOP] as const;
    case "b":
      return [right, DIGIT_TOP, right, DIGIT_MID] as const;
    case "c":
      return [right, DIGIT_MID, right, DIGIT_BOTTOM] as const;
    case "d":
      return [left, DIGIT_BOTTOM, right, DIGIT_BOTTOM] as const;
    case "e":
      return [left, DIGIT_MID, left, DIGIT_BOTTOM] as const;
    case "f":
      return [left, DIGIT_TOP, left, DIGIT_MID] as const;
    case "g":
      return [left, DIGIT_MID, right, DIGIT_MID] as const;
  }
}

function drawDigitSegments(
  g: Graphics,
  segments: readonly SegmentName[],
  offsetX: number,
  strokeWidth: number,
  color: number,
  alpha: number,
) {
  for (const seg of segments) {
    const [x1, y1, x2, y2] = segmentEndpoints(seg, offsetX);
    g
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .stroke({ width: strokeWidth, color, alpha, cap: "round", join: "round" });
  }
}

function jerseyFromAthleteId(id: string): number {
  const m = id.match(/(\d+)(?!.*\d)/);
  if (!m) return 0;
  const value = Number.parseInt(m[1], 10);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, value));
}

function drawJerseyNumber(g: Graphics, jersey: number, color: number): void {
  g.clear();
  const digits = String(jersey).padStart(1, "0").slice(-2).split("");
  const offsets =
    digits.length === 1
      ? [0]
      : [-(DIGIT_WIDTH * 0.5 + DIGIT_GAP * 0.5), DIGIT_WIDTH * 0.5 + DIGIT_GAP * 0.5];

  for (let i = 0; i < digits.length; i++) {
    const segments = DIGIT_SEGMENTS[digits[i]];
    if (!segments) continue;
    drawDigitSegments(g, segments, offsets[i] ?? 0, DIGIT_STROKE_SHADOW, 0x03120f, 0.34);
    drawDigitSegments(g, segments, offsets[i] ?? 0, DIGIT_STROKE, color, 0.98);
  }
}

function drawSoftShadow(g: Graphics): void {
  g.clear();
  g.ellipse(0, SHADOW_Y, SHADOW_RX, SHADOW_RY).fill({ color: 0x000000, alpha: 0.2 });
  g
    .ellipse(0, SHADOW_Y, SHADOW_RX * 0.54, SHADOW_RY * 0.45)
    .fill({ color: 0x000000, alpha: 0.1 });
}

function drawGlowRing(g: Graphics, palette: TeamPalette, selected: boolean, dragging: boolean): void {
  g.clear();
  if (!selected && !dragging) return;
  const coreAlpha = dragging ? 0.42 : 0.5;
  const edgeAlpha = dragging ? 0.28 : 0.38;
  g.circle(0, 0, GLOW_RADIUS).stroke({ width: 0.24, color: palette.glowColor, alpha: coreAlpha });
  g
    .circle(0, 0, GLOW_RADIUS + 0.24)
    .stroke({ width: 0.1, color: 0xffffff, alpha: edgeAlpha });
}

function drawDirectionalNub(g: Graphics, palette: TeamPalette): void {
  g.clear();
  g
    .moveTo(TOKEN_RADIUS * 0.84, -NUB_RADIUS * 0.66)
    .lineTo(TOKEN_RADIUS * 0.84, NUB_RADIUS * 0.66)
    .lineTo(NUB_X + NUB_RADIUS * 0.34, 0)
    .closePath()
    .fill({ color: palette.nubColor, alpha: 0.56 });

  g
    .circle(NUB_X, 0, NUB_RADIUS)
    .fill({ color: palette.nubColor, alpha: 0.88 })
    .stroke({ width: 0.08, color: 0xffffff, alpha: 0.62 });
}

function drawTokenBody(
  g: Graphics,
  palette: TeamPalette,
  shellGradient: FillGradient,
  coreGradient: FillGradient,
): void {
  g.clear();
  g.circle(0, 0, TOKEN_RADIUS).fill(shellGradient);
  g.circle(0, 0, CORE_RADIUS).fill(coreGradient);
  g.circle(0, -R * 0.36, R * 0.58).fill({ color: 0xffffff, alpha: 0.16 });
  g.circle(0, R * 0.36, R * 0.8).fill({ color: palette.ringShade, alpha: 0.12 });
  g.circle(0, 0, TOKEN_RADIUS - 0.03).stroke({
    width: 0.22,
    color: 0xffffff,
    alpha: 0.96,
  });
  g.circle(0, 0, TOKEN_RADIUS - 0.28).stroke({
    width: 0.08,
    color: palette.ringShade,
    alpha: 0.32,
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

export function createMicroAthleteView(): MicroAthleteView {
  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";
  container.cursor = "pointer";

  const shadow = new Graphics();
  shadow.zIndex = 0;
  const glowRing = new Graphics();
  glowRing.zIndex = 1;
  const tokenBody = new Graphics();
  tokenBody.zIndex = 2;
  const directionalNubRoot = new Container();
  directionalNubRoot.zIndex = 3;
  const directionalNub = new Graphics();
  directionalNubRoot.addChild(directionalNub);
  const jerseyNumber = new Graphics();
  jerseyNumber.zIndex = 4;

  container.addChild(shadow);
  container.addChild(glowRing);
  container.addChild(tokenBody);
  container.addChild(directionalNubRoot);
  container.addChild(jerseyNumber);

  const hitRadius = Math.max(MICRO_ATHLETE_HIT_RADIUS_WORLD, GLOW_RADIUS + 0.65);
  container.hitArea = new Circle(0, 0, hitRadius);

  let palette = teamPalette("home");
  let lastTeam: MicroAthlete["team"] = "home";
  let lastJersey = -1;
  let lastSelected = false;
  let lastDragging = false;
  let shellGradient = new FillGradient({
    type: "linear",
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: palette.shellTop },
      { offset: 1, color: palette.shellBottom },
    ],
  });
  let coreGradient = new FillGradient({
    type: "linear",
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    textureSpace: "local",
    colorStops: [
      { offset: 0, color: palette.coreTop },
      { offset: 1, color: palette.coreBottom },
    ],
  });

  const redrawStaticLayers = (team: MicroAthlete["team"], jersey: number) => {
    palette = teamPalette(team);
    shellGradient.destroy();
    coreGradient.destroy();
    shellGradient = new FillGradient({
      type: "linear",
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
      textureSpace: "local",
      colorStops: [
        { offset: 0, color: palette.shellTop },
        { offset: 1, color: palette.shellBottom },
      ],
    });
    coreGradient = new FillGradient({
      type: "linear",
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
      textureSpace: "local",
      colorStops: [
        { offset: 0, color: palette.coreTop },
        { offset: 1, color: palette.coreBottom },
      ],
    });
    drawSoftShadow(shadow);
    drawTokenBody(tokenBody, palette, shellGradient, coreGradient);
    drawDirectionalNub(directionalNub, palette);
    drawJerseyNumber(jerseyNumber, jersey, palette.numberColor);
  };

  const redrawAuraLayer = (selected: boolean, dragging: boolean) => {
    drawGlowRing(glowRing, palette, selected, dragging);
  };

  redrawStaticLayers("home", 0);
  redrawAuraLayer(false, false);

  const sync = (
    athlete: MicroAthlete,
    selected: boolean,
    dragging: boolean,
  ): boolean => {
    const { x, y } = boardNormToWorld(athlete.nx, athlete.ny);
    container.position.set(x, y);
    directionalNubRoot.rotation = athlete.headingRad;
    const jersey = jerseyFromAthleteId(athlete.id);

    if (lastTeam !== athlete.team || lastJersey !== jersey) {
      lastTeam = athlete.team;
      lastJersey = jersey;
      redrawStaticLayers(athlete.team, jersey);
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
      dragging || selected ? 0.004 * Math.sin(t * 1.2) : 0.012 * Math.sin(t * 1.05);
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
      shellGradient.destroy();
      coreGradient.destroy();
      container.destroy({ children: true });
    },
  };
}
