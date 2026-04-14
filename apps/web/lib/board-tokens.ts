export const boardLines = {
  gaelic: {
    lineGridStrong: "rgba(255,255,255,0.42)",
    lineGridMid: "rgba(255,255,255,0.4)",
    lineGridSoft: "rgba(255,255,255,0.38)",
    lineScoringEnd: "rgba(255,255,255,0.4)",
    lineCentre: "rgba(255,255,255,0.52)",
    arc2Point: "rgba(255,255,255,0.42)",
    spot: "rgba(255,255,255,0.55)",
  },
} as const;

export const boardGrass = {
  gaelic: {
    top: "#14532d",
    mid: "#166534",
    bottom: "#15803d",
  },
} as const;

export const boardGrassLightGaelic = {
  highlightPeak: 0.2,
  highlightMid: 0.06,
  vignetteEdge: 0.38,
} as const;

export const boardStripes = {
  fineWhiteDot: 0.04,
  fineDarkDot: 0.05,
  fineGaaOpacity: 0.85,
  gaelicBladeOpacity: 1,
} as const;

export const boardHighlightZone = {
  fill: "rgba(16, 185, 129, 0.16)",
  stroke: "rgba(52, 211, 153, 0.7)",
} as const;
