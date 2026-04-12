/**
 * Multi-sport pitch definition for the tactical board.
 * Legacy frame 160×100; inner playing rect x∈[2,158], y∈[2,98].
 * All sports: landscape pitchside — goals left/right, length on +x, width on +y.
 * Soccer markings are authored in the same landscape frame as Gaelic (length on +x, width on +y).
 * Hurling reuses the Gaelic football marking array (same pitch until hurling-specific lines are authored).
 */

import { boardLines } from "@/lib/board-tokens";
import { GAELIC_FOOTBALL_FIELD_SPEC } from "@/config/fieldSpec";

export type PitchSport = "soccer" | "gaelic" | "hurling";

const Lg = boardLines.gaelic;

/** Stats / `buildPitchHighlightRect` use this inner rectangle in 160×100 space. */
export const LEGACY_PITCH_HIGHLIGHT_INNER = {
  x: 2,
  y: 2,
  w: 156,
  h: 96,
} as const;

type LineSpec = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
};

type RectSpec = {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
};

type CircleSpec = {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
};

/** Ellipse for non-circular arcs in viewBox space (e.g. IFAB centre circle on a length≠width pitch). */
type EllipseSpec = {
  kind: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  stroke: string;
  strokeWidth: number;
  fill?: string;
};

/** Arc or polyline encoded as an SVG path (no fill unless fill set). */
type PathSpec = {
  kind: "path";
  d: string;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  opacity?: number;
  strokeLinecap?: "round" | "butt";
  strokeDasharray?: string;
  /** When true, render outside the pitch line glow filter (e.g. crisp 2-point arc). */
  skipLineGlow?: boolean;
};

type TextSpec = {
  kind: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
  fontWeight?: string;
  textAnchor?: "start" | "middle" | "end";
  opacity?: number;
};

export type PitchMarking =
  | LineSpec
  | RectSpec
  | CircleSpec
  | EllipseSpec
  | PathSpec
  | TextSpec;

export type PitchConfig = {
  viewBox: { w: number; h: number };
  markings: PitchMarking[];
  /**
   * Playing rectangle in viewBox units. When different from `LEGACY_PITCH_HIGHLIGHT_INNER`,
   * live pitch highlights are affine-mapped from legacy space into this inner rect.
   */
  inner: { x: number; y: number; w: number; h: number };
};

const VB = { w: 160, h: 100 };

const rnd3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * FIFA / IFAB soccer field on inner 156×96 vb (105 m × 68 m playing area). Goals left/right.
 * Penalty area 40.32 m × 16.5 m; goal area 18.32 m × 5.5 m; centre circle r 9.15 m; penalty spot 11 m.
 */
const soccerMarkings: PitchMarking[] = (() => {
  const wTouch = 0.52;
  const wHalf = 0.6;
  const wCircle = 0.48;
  const wPen = 0.48;
  const wSix = 0.38;
  const wGoalGraphic = 0.42;
  const ix = 2;
  const iy = 2;
  const playW = 156;
  const playH = 96;
  const xRight = ix + playW;
  const yBottom = iy + playH;
  const cx = ix + playW / 2;
  const cy = iy + playH / 2;
  const lenM = 105;
  const widM = 68;

  const xLen = (mFromLeftGoal: number) => ix + (mFromLeftGoal / lenM) * playW;
  const penDepth = (16.5 / lenM) * playW;
  const penHalfH = ((40.32 / 2) / widM) * playH;
  const sixDepth = (5.5 / lenM) * playW;
  const sixHalfH = ((18.32 / 2) / widM) * playH;
  const penY = cy - penHalfH;
  const penH = penHalfH * 2;
  const sixY = cy - sixHalfH;
  const sixH = sixHalfH * 2;

  const penFrontL = ix + penDepth;
  const penFrontR = xRight - penDepth;
  const spotXL = xLen(11);
  const spotXR = xLen(lenM - 11);
  const rxArc = (9.15 / lenM) * playW;
  const ryArc = (9.15 / widM) * playH;
  const rxCentre = rxArc;
  const ryCentre = ryArc;

  const chordDy = (spotX: number, lineX: number): number => {
    const t = ((lineX - spotX) / rxArc) ** 2;
    if (t >= 1) return ryArc * 0.82;
    return ryArc * Math.sqrt(Math.max(0, 1 - t));
  };

  const dyL = chordDy(spotXL, penFrontL);
  const arcLeftD = `M ${rnd3(penFrontL)} ${rnd3(cy - dyL)} A ${rnd3(rxArc)} ${rnd3(ryArc)} 0 0 1 ${rnd3(penFrontL)} ${rnd3(cy + dyL)}`;
  const dyR = chordDy(spotXR, penFrontR);
  const arcRightD = `M ${rnd3(penFrontR)} ${rnd3(cy - dyR)} A ${rnd3(rxArc)} ${rnd3(ryArc)} 0 0 0 ${rnd3(penFrontR)} ${rnd3(cy + dyR)}`;

  const goalMouthH = (7.32 / widM) * playH;
  const gTop = cy - goalMouthH / 2;
  const gBot = cy + goalMouthH / 2;
  const netDepth = 1.55;

  const netFill = "rgba(255,255,255,0.11)";
  const netStroke = "rgba(255,255,255,0.45)";

  return [
    {
      kind: "rect",
      x: ix,
      y: iy,
      w: playW,
      h: playH,
      stroke: Lg.lineGridStrong,
      strokeWidth: wTouch,
    },
    {
      kind: "rect",
      x: ix,
      y: penY,
      w: penDepth,
      h: penH,
      stroke: Lg.lineGridMid,
      strokeWidth: wPen,
    },
    {
      kind: "rect",
      x: penFrontR,
      y: penY,
      w: penDepth,
      h: penH,
      stroke: Lg.lineGridMid,
      strokeWidth: wPen,
    },
    {
      kind: "rect",
      x: ix,
      y: sixY,
      w: sixDepth,
      h: sixH,
      stroke: Lg.lineScoringEnd,
      strokeWidth: wSix,
    },
    {
      kind: "rect",
      x: xRight - sixDepth,
      y: sixY,
      w: sixDepth,
      h: sixH,
      stroke: Lg.lineScoringEnd,
      strokeWidth: wSix,
    },
    {
      kind: "path",
      d: arcLeftD,
      stroke: Lg.lineGridMid,
      strokeWidth: 0.44,
      strokeLinecap: "round",
      skipLineGlow: true,
    },
    {
      kind: "path",
      d: arcRightD,
      stroke: Lg.lineGridMid,
      strokeWidth: 0.44,
      strokeLinecap: "round",
      skipLineGlow: true,
    },
    {
      kind: "circle",
      cx: spotXL,
      cy,
      r: 0.38,
      fill: Lg.lineGridStrong,
      stroke: "rgba(0,0,0,0.16)",
      strokeWidth: 0.06,
    },
    {
      kind: "circle",
      cx: spotXR,
      cy,
      r: 0.38,
      fill: Lg.lineGridStrong,
      stroke: "rgba(0,0,0,0.16)",
      strokeWidth: 0.06,
    },
    {
      kind: "line",
      x1: cx,
      y1: iy,
      x2: cx,
      y2: yBottom,
      stroke: Lg.lineCentre,
      strokeWidth: wHalf,
    },
    {
      kind: "ellipse",
      cx,
      cy,
      rx: rxCentre,
      ry: ryCentre,
      stroke: Lg.lineGridMid,
      strokeWidth: wCircle,
    },
    {
      kind: "circle",
      cx,
      cy,
      r: 0.85,
      fill: Lg.spot,
    },
    {
      kind: "rect",
      x: ix - netDepth,
      y: gTop,
      w: netDepth,
      h: goalMouthH,
      stroke: netStroke,
      strokeWidth: 0.22,
      fill: netFill,
    },
    {
      kind: "line",
      x1: ix,
      y1: gTop,
      x2: ix,
      y2: gBot,
      stroke: "rgba(255,255,255,0.92)",
      strokeWidth: wGoalGraphic,
    },
    {
      kind: "line",
      x1: ix - netDepth * 0.35,
      y1: gTop,
      x2: ix,
      y2: gTop,
      stroke: "rgba(255,255,255,0.88)",
      strokeWidth: 0.32,
    },
    {
      kind: "line",
      x1: ix - netDepth * 0.35,
      y1: gBot,
      x2: ix,
      y2: gBot,
      stroke: "rgba(255,255,255,0.88)",
      strokeWidth: 0.32,
    },
    {
      kind: "rect",
      x: xRight,
      y: gTop,
      w: netDepth,
      h: goalMouthH,
      stroke: netStroke,
      strokeWidth: 0.22,
      fill: netFill,
    },
    {
      kind: "line",
      x1: xRight,
      y1: gTop,
      x2: xRight,
      y2: gBot,
      stroke: "rgba(255,255,255,0.92)",
      strokeWidth: wGoalGraphic,
    },
    {
      kind: "line",
      x1: xRight + netDepth * 0.35,
      y1: gTop,
      x2: xRight,
      y2: gTop,
      stroke: "rgba(255,255,255,0.88)",
      strokeWidth: 0.32,
    },
    {
      kind: "line",
      x1: xRight + netDepth * 0.35,
      y1: gBot,
      x2: xRight,
      y2: gBot,
      stroke: "rgba(255,255,255,0.88)",
      strokeWidth: 0.32,
    },
  ];
})();

/** Gaelic football landscape: length 145 m on +x, width 90 m on +y (inner 156×96 vb). */
const GAELIC_LANDSCAPE_LEN_M = 145;
const GAELIC_LANDSCAPE_WID_M = 90;
/** Small rect: 4.5 m into field × 14 m along goal line (goal line = back edge). */
const GAELIC_SMALL_DEEP_M = 4.5;
const GAELIC_SMALL_WIDE_M = 14;
/** Large rect: 13 m × 19 m (Official Guide scoring ends). */
const GAELIC_LARGE_DEEP_M = 13;
const GAELIC_LARGE_WIDE_M = 19;
/** 20 m free arc: centre on 20 m ∩ centre line, r = 13 m into field. */
const GAELIC_D_FREE_RADIUS_M = 13;
/** 2-point arc: centre on goal-line midpoint, r = 40 m; visible segment from 20 m line outward. */
const GAELIC_TWO_POINT_RADIUS_M = 40;
const GAELIC_PENALTY_SPOT_M = 11;

/**
 * Gaelic football landscape (145×90 m → inner 156×96 vb). Hurling reuses this marking set verbatim.
 */
function buildGaelicFootballLandscapeMarkings(): PitchMarking[] {
  const spec = GAELIC_FOOTBALL_FIELD_SPEC;
  const playW = 156;
  const playH = 96;
  const ix = 2;
  const iy = 2;
  const xRight = ix + playW;
  const yBottom = iy + playH;
  const Lm = GAELIC_LANDSCAPE_LEN_M;
  const t13 = 13 / Lm;
  const t20 = 20 / Lm;
  const t45 = 45 / Lm;

  const xAt = (lenFrac: number) => ix + lenFrac * playW;

  const dash13 = "4.2 3.6";
  const wTouch = 0.52;
  const wHalf = 0.6;
  const w45 = 0.54;
  const w20 = 0.48;
  const w13 = 0.32;
  const wEnd = 0.46;
  const wEndInner = 0.42;
  const wD = 0.6;
  const w2Point = 0.6;

  const cx = ix + 0.5 * playW;
  const cy = iy + 0.5 * playH;

  const x13L = xAt(t13);
  const x13R = xAt(1 - t13);
  const x20L = xAt(t20);
  const x20R = xAt(1 - t20);
  const x45L = xAt(t45);
  const x45R = xAt(1 - t45);
  const xMid = xAt(0.5);

  const smallDeep = (GAELIC_SMALL_DEEP_M / GAELIC_LANDSCAPE_LEN_M) * playW;
  const smallWide = (GAELIC_SMALL_WIDE_M / GAELIC_LANDSCAPE_WID_M) * playH;
  const largeDeep = (GAELIC_LARGE_DEEP_M / GAELIC_LANDSCAPE_LEN_M) * playW;
  const largeWide = (GAELIC_LARGE_WIDE_M / GAELIC_LANDSCAPE_WID_M) * playH;

  const ySmallTop = cy - smallWide / 2;
  const yLargeTop = cy - largeWide / 2;

  const rCentre = (spec.centreCircleRadiusM / GAELIC_LANDSCAPE_LEN_M) * playW;

  const xPenL = xAt(GAELIC_PENALTY_SPOT_M / GAELIC_LANDSCAPE_LEN_M);
  const xPenR = xAt(1 - GAELIC_PENALTY_SPOT_M / GAELIC_LANDSCAPE_LEN_M);
  const rSpot = 0.36;

  /** 13 m radius semicircle on 20 m line; sweep opens outside 20 m (toward halfway, not goal). */
  const rxD = (GAELIC_D_FREE_RADIUS_M / GAELIC_LANDSCAPE_LEN_M) * playW;
  const ryD = (GAELIC_D_FREE_RADIUS_M / GAELIC_LANDSCAPE_WID_M) * playH;
  const dLeft = `M ${rnd3(x20L)} ${rnd3(cy - ryD)} A ${rnd3(rxD)} ${rnd3(ryD)} 0 1 1 ${rnd3(x20L)} ${rnd3(cy + ryD)}`;
  const dRight = `M ${rnd3(x20R)} ${rnd3(cy - ryD)} A ${rnd3(rxD)} ${rnd3(ryD)} 0 1 0 ${rnd3(x20R)} ${rnd3(cy + ryD)}`;

  /** 40 m ellipse from goal-line centre; arc between intersections with 20 m line, field side only. */
  const rx40 = (GAELIC_TWO_POINT_RADIUS_M / GAELIC_LANDSCAPE_LEN_M) * playW;
  const ry40 = (GAELIC_TWO_POINT_RADIUS_M / GAELIC_LANDSCAPE_WID_M) * playH;
  const sin60 = Math.sin(Math.PI / 3);
  const yArcLo = cy - ry40 * sin60;
  const yArcHi = cy + ry40 * sin60;
  const twoPtLeft = `M ${rnd3(x20L)} ${rnd3(yArcLo)} A ${rnd3(rx40)} ${rnd3(ry40)} 0 0 1 ${rnd3(x20L)} ${rnd3(yArcHi)}`;
  const twoPtRight = `M ${rnd3(x20R)} ${rnd3(yArcLo)} A ${rnd3(rx40)} ${rnd3(ry40)} 0 0 0 ${rnd3(x20R)} ${rnd3(yArcHi)}`;

  return [
    {
      kind: "rect",
      x: ix,
      y: iy,
      w: playW,
      h: playH,
      stroke: Lg.lineGridStrong,
      strokeWidth: wTouch,
    },
    {
      kind: "line",
      x1: x13L,
      y1: iy,
      x2: x13L,
      y2: yBottom,
      stroke: Lg.lineGridSoft,
      strokeWidth: w13,
      strokeDasharray: dash13,
    },
    {
      kind: "line",
      x1: x13R,
      y1: iy,
      x2: x13R,
      y2: yBottom,
      stroke: Lg.lineGridSoft,
      strokeWidth: w13,
      strokeDasharray: dash13,
    },
    {
      kind: "line",
      x1: x20L,
      y1: iy,
      x2: x20L,
      y2: yBottom,
      stroke: Lg.lineGridMid,
      strokeWidth: w20,
    },
    {
      kind: "line",
      x1: x20R,
      y1: iy,
      x2: x20R,
      y2: yBottom,
      stroke: Lg.lineGridMid,
      strokeWidth: w20,
    },
    {
      kind: "line",
      x1: x45L,
      y1: iy,
      x2: x45L,
      y2: yBottom,
      stroke: Lg.lineGridStrong,
      strokeWidth: w45,
    },
    {
      kind: "line",
      x1: x45R,
      y1: iy,
      x2: x45R,
      y2: yBottom,
      stroke: Lg.lineGridStrong,
      strokeWidth: w45,
    },
    {
      kind: "line",
      x1: xMid,
      y1: iy,
      x2: xMid,
      y2: yBottom,
      stroke: Lg.lineCentre,
      strokeWidth: wHalf,
    },
    {
      kind: "circle",
      cx,
      cy,
      r: rCentre,
      stroke: Lg.lineGridMid,
      strokeWidth: w20,
    },
    {
      kind: "circle",
      cx,
      cy,
      r: 0.85,
      fill: Lg.spot,
    },
    {
      kind: "circle",
      cx: xPenL,
      cy,
      r: rSpot,
      fill: Lg.lineGridStrong,
      stroke: "rgba(0,0,0,0.18)",
      strokeWidth: 0.06,
    },
    {
      kind: "circle",
      cx: xPenR,
      cy,
      r: rSpot,
      fill: Lg.lineGridStrong,
      stroke: "rgba(0,0,0,0.18)",
      strokeWidth: 0.06,
    },
    {
      kind: "rect",
      x: ix,
      y: yLargeTop,
      w: largeDeep,
      h: largeWide,
      stroke: Lg.lineScoringEnd,
      strokeWidth: wEnd,
    },
    {
      kind: "rect",
      x: xRight - largeDeep,
      y: yLargeTop,
      w: largeDeep,
      h: largeWide,
      stroke: Lg.lineScoringEnd,
      strokeWidth: wEnd,
    },
    {
      kind: "rect",
      x: ix,
      y: ySmallTop,
      w: smallDeep,
      h: smallWide,
      stroke: Lg.lineScoringEnd,
      strokeWidth: wEndInner,
    },
    {
      kind: "rect",
      x: xRight - smallDeep,
      y: ySmallTop,
      w: smallDeep,
      h: smallWide,
      stroke: Lg.lineScoringEnd,
      strokeWidth: wEndInner,
    },
    {
      kind: "path",
      d: twoPtLeft,
      stroke: Lg.arc2Point,
      strokeWidth: w2Point,
      strokeLinecap: "round",
      skipLineGlow: true,
    },
    {
      kind: "path",
      d: twoPtRight,
      stroke: Lg.arc2Point,
      strokeWidth: w2Point,
      strokeLinecap: "round",
      skipLineGlow: true,
    },
    {
      kind: "path",
      d: dLeft,
      stroke: Lg.lineCentre,
      strokeWidth: wD,
      strokeLinecap: "round",
      skipLineGlow: true,
    },
    {
      kind: "path",
      d: dRight,
      stroke: Lg.lineCentre,
      strokeWidth: wD,
      strokeLinecap: "round",
      skipLineGlow: true,
    },
  ];
}

const gaelicLandscapeMarkings = buildGaelicFootballLandscapeMarkings();

export const pitchConfig: Record<PitchSport, PitchConfig> = {
  soccer: {
    viewBox: VB,
    inner: { x: 2, y: 2, w: 156, h: 96 },
    markings: soccerMarkings,
  },
  gaelic: {
    viewBox: VB,
    inner: { x: 2, y: 2, w: 156, h: 96 },
    markings: gaelicLandscapeMarkings,
  },
  /** Same pitch as Gaelic football until a dedicated hurling marking set is needed. */
  hurling: {
    viewBox: VB,
    inner: { x: 2, y: 2, w: 156, h: 96 },
    markings: gaelicLandscapeMarkings,
  },
};

export function getPitchConfig(sport: PitchSport): PitchConfig {
  return pitchConfig[sport];
}

/** CSS `aspect-ratio` (width / height) for the pitch container — matches SVG viewBox. */
export function getPitchBoardAspectRatio(_sport: PitchSport): string {
  void _sport;
  return "35 / 24";
}

export type PitchHighlightRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Map highlight geometry from legacy stats space into the configured inner rectangle. */
export function mapPitchHighlightToInner(
  rect: PitchHighlightRect,
  inner: PitchConfig["inner"],
): PitchHighlightRect {
  const L = LEGACY_PITCH_HIGHLIGHT_INNER;
  return {
    x: inner.x + ((rect.x - L.x) / L.w) * inner.w,
    y: inner.y + ((rect.y - L.y) / L.h) * inner.h,
    w: (rect.w / L.w) * inner.w,
    h: (rect.h / L.h) * inner.h,
  };
}
