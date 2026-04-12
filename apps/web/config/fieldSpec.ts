/**
 * Board-only GAA field definitions. All vertical positions are normalised yn ∈ [0,1]
 * from top endline (0) to bottom endline (1). Source: official line distances + reference length.
 */

export type GaaFieldYn = {
  /** 13 m from top endline */
  line13Top: number;
  /** 20 m from top endline */
  line20Top: number;
  /** 45 m (football) or 65 m (hurling) from top endline */
  lineFarTop: number;
  halfway: number;
  /** 45 m / 65 m from bottom endline → yn from top */
  lineFarBottom: number;
  line20Bottom: number;
  line13Bottom: number;
};

export type GaaFieldSpec = {
  readonly id: "gaelic_football" | "hurling";
  /** Reference playing length (m); yn are defined relative to this. */
  readonly lengthM: number;
  readonly widthM: number;
  /** Goal opening (between posts), m */
  readonly goalOpeningM: number;
  /** Line paint nominal width on grass (~90 mm per GAA spec band). */
  readonly lineWidthM: number;
  readonly yn: GaaFieldYn;
  /** Which “far” full-width line (for docs / tooling). */
  readonly farLineMetres: 45 | 65;
  readonly smallRectDepthM: 14;
  readonly largeRectDepthM: 21;
  readonly centreCircleRadiusM: 3;
  /** Scoring / two-point arc: semellipse from goal, radius in metres on the pitch plane. */
  readonly twoPointArcRadiusM: 20;
};

/**
 * Gaelic football — 145 m reference length.
 * Visual spacing pass: end-zone gaps (goal→13→20→45) expanded ~18% vs strict m/L ratios;
 * 45↔halfway slightly compressed so halfway stays 0.5. Coach readability only — hurling unchanged.
 */
export const GAELIC_FOOTBALL_FIELD_SPEC = {
  id: "gaelic_football",
  lengthM: 145,
  widthM: 90,
  goalOpeningM: 6.5,
  lineWidthM: 0.09,
  farLineMetres: 45,
  yn: {
    line13Top: 0.1058,
    line20Top: 0.1627,
    lineFarTop: 0.3661,
    halfway: 0.5,
    lineFarBottom: 0.6338,
    line20Bottom: 0.8373,
    line13Bottom: 0.8942,
  },
  smallRectDepthM: 14,
  largeRectDepthM: 21,
  centreCircleRadiusM: 3,
  twoPointArcRadiusM: 20,
} as const satisfies GaaFieldSpec;

const L = 145;
const W = 90;

/**
 * Hurling — same 145×90 m as football; far line 65 m from each end (yn = 65/145).
 * Board canvas draws hurling in landscape (goals left/right); `yn` is used by pitchConfig only.
 */
export const HURLING_FIELD_SPEC = {
  id: "hurling",
  lengthM: L,
  widthM: W,
  goalOpeningM: 6.5,
  lineWidthM: 0.09,
  farLineMetres: 65,
  yn: {
    line13Top: 13 / L,
    line20Top: 20 / L,
    lineFarTop: 65 / L,
    halfway: 0.5,
    lineFarBottom: 1 - 65 / L,
    line20Bottom: 1 - 20 / L,
    line13Bottom: 1 - 13 / L,
  },
  smallRectDepthM: 14,
  largeRectDepthM: 21,
  centreCircleRadiusM: 3,
  twoPointArcRadiusM: 20,
} as const satisfies GaaFieldSpec;
