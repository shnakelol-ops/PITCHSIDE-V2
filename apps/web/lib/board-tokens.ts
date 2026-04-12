/**
 * Board-layer colour tokens: grass, striping, line paint, chrome, markers.
 * Consumed by pitch config, pitch canvas, and board-v1-panel only.
 */

/** Base grass fills (matte: compressed tonal range, no “plastic” pop). */
export const boardGrass = {
  soccer: {
    top: "#1a4d2e",
    mid: "#1b5c36",
    bottom: "#176e3a",
  },
  gaelic: {
    top: "#15382a",
    mid: "#1b3d2f",
    bottom: "#1e4d38",
  },
} as const;

/** Turf overlay: vertical mow + fine noise opacities (subtle striping). */
export const boardStripes = {
  mowPeriod: 12,
  mowLightOpacity: 0.02,
  mowDarkOpacity: 0.028,
  fineOpacity: 0.72,
  /** Less “graph paper” on all pitch boards (shared with soccer for Gaelic-matched canvas). */
  fineGaaOpacity: 0.36,
  /** Faint turf blade overlay (Gaelic landscape pitch-canvas). */
  gaelicBladeOpacity: 0.15,
  fineWhiteDot: 0.032,
  fineDarkDot: 0.038,
} as const;

/** Ambient light over grass (matte = softer specular). */
export const boardGrassLight = {
  highlightPeak: 0.1,
  highlightMid: 0.035,
  vignetteEdge: 0.34,
} as const;

/** Gaelic landscape: slightly brighter “floodlight” centre (pitch-canvas only). */
export const boardGrassLightGaelic = {
  highlightPeak: 0.14,
  highlightMid: 0.048,
  vignetteEdge: 0.3,
} as const;

/** Pitch line paint (SVG strokes / fills). */
export const boardLines = {
  soccer: {
    touch: "rgba(255,255,255,0.4)",
    centre: "rgba(255,255,255,0.5)",
    circle: "rgba(255,255,255,0.44)",
    penalty: "rgba(255,255,255,0.38)",
    goalArea: "rgba(255,255,255,0.32)",
    penaltyEdge: "rgba(255,255,255,0.36)",
    spot: "rgba(255,255,255,0.52)",
  },
  gaelic: {
    /** ~2px at typical scale; high contrast on #1b3d2f */
    linePrimary: "rgba(255,255,255,0.94)",
    /** ~1px; 13 m markers */
    lineThin: "rgba(255,255,255,0.9)",
    touch: "rgba(255,255,255,0.94)",
    centre: "rgba(255,255,255,0.94)",
    circle: "rgba(255,255,255,0.94)",
    spot: "rgba(255,255,255,0.85)",
    grid13: "rgba(255,255,255,0.9)",
    grid20: "rgba(255,255,255,0.94)",
    grid45: "rgba(255,255,255,0.94)",
    largeRect: "rgba(255,255,255,0.94)",
    smallRect: "rgba(255,255,255,0.94)",
    arc13: "rgba(255,255,255,0.52)",
    /** Hurling / metric pitch: 2-point arc from end line (legacy builder). */
    arc2: "rgba(234, 179, 8, 0.94)",
    /** Gaelic football normalized board: 2-point arc on 20 m line — muted gold, not neon. */
    arc2Gaelic: "rgba(186, 148, 62, 0.92)",
    /** Live stats: yellow arc, lower alpha so it reads as line paint not UI chrome. */
    arc2Live: "rgba(234, 179, 8, 0.58)",
    /** 40 m 2-point arc: line-paint ochre; full alpha so it matches crisp SVG strokes like the halfway line. */
    arc2Point: "rgba(232, 210, 118, 0.94)",
    /** Distant / secondary grid (13 m) — reads as paint, not UI guides. */
    lineGridSoft: "rgba(255,255,255,0.42)",
    /** Mid hierarchy (20 m). */
    lineGridMid: "rgba(255,255,255,0.82)",
    /** Strong hierarchy (45 m, touch). */
    lineGridStrong: "rgba(255,255,255,0.9)",
    /** Halfway / structure emphasis. */
    lineCentre: "rgba(255,255,255,0.96)",
    /** Scoring-end boxes — slightly quieter than open play lines. */
    lineScoringEnd: "rgba(255,255,255,0.86)",
  },
} as const;

export const boardHighlightZone = {
  fill: "rgba(250, 204, 21, 0.22)",
  stroke: "rgba(253, 224, 71, 0.88)",
} as const;

/** Panel shell + pitch bezel (Tailwind class strings). */
export const boardChrome = {
  shellSoccer:
    "border-white/75 bg-gradient-to-b from-white via-white to-slate-50/40 shadow-[0_28px_64px_-28px_rgba(15,118,110,0.22),0_0_0_1px_rgba(15,118,110,0.05)] ring-slate-900/[0.03] dark:border-slate-700/85 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/90 dark:shadow-[0_40px_88px_-36px_rgba(0,0,0,0.58),0_0_0_1px_rgba(255,255,255,0.04)] dark:ring-white/[0.04]",
  shellGaa:
    "border-emerald-900/30 bg-gradient-to-b from-emerald-950/45 via-pitchside-950/35 to-emerald-950/50 shadow-[0_28px_64px_-28px_rgba(6,78,59,0.38),0_0_0_1px_rgba(20,83,45,0.14)] ring-emerald-900/25 dark:border-emerald-800/45 dark:from-emerald-950/58 dark:via-pitchside-950/48 dark:to-black dark:shadow-[0_40px_88px_-36px_rgba(0,0,0,0.55)] dark:ring-emerald-900/35",
  bezelSoccer:
    "rounded-[1.125rem] bg-gradient-to-b from-pitchside-300/45 via-pitchside-600/22 to-slate-900/28 p-[5px] shadow-[0_28px_64px_-20px_rgba(15,118,110,0.48),0_12px_36px_-20px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-pitchside-900/20 drop-shadow-[0_10px_36px_-10px_rgba(15,118,110,0.32)] dark:from-pitchside-500/32 dark:via-pitchside-800/28 dark:to-slate-950/55 dark:shadow-[0_32px_72px_-26px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.07)] dark:ring-pitchside-400/22",
  bezelGaa:
    "rounded-[1.125rem] bg-gradient-to-b from-emerald-950 via-pitchside-950 to-emerald-950 p-1 shadow-[0_32px_72px_-22px_rgba(6,78,59,0.58),0_14px_42px_-18px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-emerald-700/45 drop-shadow-[0_14px_44px_-14px_rgba(5,150,105,0.38)] dark:from-emerald-950 dark:via-pitchside-950 dark:to-black dark:ring-emerald-500/30 dark:shadow-[0_38px_88px_-28px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.05)]",
} as const;

/** Player marker: compact raised disc (lightweight SVG-free; board overlay only). */
export const boardMarkers = {
  base:
    "absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full border text-[13px] font-bold tabular-nums leading-none tracking-tight antialiased active:cursor-grabbing",
  home:
    "border-slate-900/12 bg-gradient-to-b from-white via-white to-slate-200/95 text-slate-900 shadow-[0_2px_6px_rgba(0,0,0,0.22),0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-white/75 dark:from-slate-100 dark:via-slate-100 dark:to-slate-300/90 dark:text-slate-950 dark:border-slate-800/25 dark:ring-white/25",
  away:
    "border-amber-900/15 bg-gradient-to-b from-amber-50 via-amber-100/95 to-amber-200/90 text-amber-950 shadow-[0_2px_6px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)] ring-1 ring-amber-50/80 dark:from-amber-100 dark:via-amber-200 dark:to-amber-300/95 dark:text-amber-950 dark:border-amber-900/30",
  neutral:
    "border-slate-800/12 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300/95 text-slate-900 shadow-[0_2px_5px_rgba(0,0,0,0.18),0_1px_1px_rgba(0,0,0,0.08)] ring-1 ring-white/50 dark:from-slate-500 dark:via-slate-600 dark:to-slate-700 dark:text-white dark:border-slate-950/40",
  selected:
    "z-[11] scale-[1.05] ring-2 ring-white/95 shadow-[0_0_0_2px_rgb(52,211,153),0_8px_20px_rgba(0,0,0,0.35)] ring-offset-2 ring-offset-emerald-950 dark:ring-offset-emerald-950",
} as const;
