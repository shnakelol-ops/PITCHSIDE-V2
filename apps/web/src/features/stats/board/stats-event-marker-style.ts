import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import {
  isStatsV1ScoreKind,
  type StatsV1ScoreKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";

/**
 * View styles for `StatsLoggedEvent` pitch markers — consumed by Pixi (`stats-event-graphics`) and legacy Konva.
 */
export type StatsEventMarkerStyle = {
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowBlur: number;
  shadowColor: string;
};

export type StatsMarkerStyleOptions = {
  reviewMode?: StatsReviewMode;
  /** Tighter dots on narrow viewports — less overlap, same semantics. */
  density?: "comfortable" | "compact";
};

type EmphasisKind =
  | "wide"
  | "shot"
  | "turnover"
  | "kickout"
  | "free"
  | "score";

function emphasisKind(event: StatsLoggedEvent): EmphasisKind {
  switch (event.kind) {
    case "WIDE":
      return "wide";
    case "SHOT":
      return "shot";
    case "TURNOVER_WON":
    case "TURNOVER_LOST":
      return "turnover";
    case "KICKOUT_WON":
    case "KICKOUT_LOST":
      return "kickout";
    case "FREE_WON":
    case "FREE_CONCEDED":
      return "free";
    case "GOAL":
    case "POINT":
    case "TWO_POINT":
      return "score";
    default: {
      const _e: never = event.kind;
      return _e;
    }
  }
}

function applyReviewEmphasis(
  s: StatsEventMarkerStyle,
  review: "halftime" | "full_time",
  kind: EmphasisKind,
): StatsEventMarkerStyle {
  const phaseBoost = review === "full_time" ? 1.08 : 1.04;
  const kindRadius: Record<EmphasisKind, number> = {
    wide: 1.44,
    shot: 1.22,
    turnover: 1.26,
    kickout: 1.14,
    free: 1.1,
    score: 1.16,
  };
  const kindStroke: Record<EmphasisKind, number> = {
    wide: 1.32,
    shot: 1.18,
    turnover: 1.2,
    kickout: 1.1,
    free: 1.08,
    score: 1.12,
  };
  const rMul = kindRadius[kind] * phaseBoost;
  const swMul = kindStroke[kind] * phaseBoost;
  return {
    ...s,
    radius: s.radius * rMul,
    strokeWidth: Math.min(1.35, s.strokeWidth * swMul),
    shadowBlur: s.shadowBlur * 1.22 * phaseBoost,
  };
}

/** Scores: green-forward family (distinct per type). */
function scoreStyle(
  scoreKind: StatsV1ScoreKind,
  attributed: boolean,
): StatsEventMarkerStyle {
  const soft = !attributed;
  switch (scoreKind) {
    case "GOAL":
      return {
        radius: soft ? 3.35 : 3.65,
        fill: soft ? "rgba(34, 197, 94, 0.88)" : "rgb(22 163 74)",
        stroke: soft ? "rgba(250, 204, 21, 0.75)" : "rgb(250 204 21)",
        strokeWidth: soft ? 0.52 : 0.78,
        shadowBlur: soft ? 2.5 : 5,
        shadowColor: "rgba(0,0,0,0.38)",
      };
    case "POINT":
      return {
        radius: soft ? 2.48 : 2.62,
        fill: soft ? "rgba(204, 251, 241, 0.92)" : "rgb(153 246 228)",
        stroke: soft ? "rgba(13, 148, 136, 0.55)" : "rgb(15 118 110)",
        strokeWidth: soft ? 0.38 : 0.5,
        shadowBlur: soft ? 1.8 : 3,
        shadowColor: "rgba(0,0,0,0.24)",
      };
    case "TWO_POINT":
      return {
        radius: soft ? 2.62 : 2.78,
        fill: soft ? "rgba(52, 211, 153, 0.9)" : "rgb(16 185 129)",
        stroke: soft ? "rgba(124, 58, 237, 0.65)" : "rgb(109 40 217)",
        strokeWidth: soft ? 0.4 : 0.54,
        shadowBlur: soft ? 2 : 3.5,
        shadowColor: "rgba(0,0,0,0.28)",
      };
  }
}

function liveMarkerStyle(event: StatsLoggedEvent): StatsEventMarkerStyle {
  if (isStatsV1ScoreKind(event.kind)) {
    const attributed = event.playerId != null && event.playerId.length > 0;
    return scoreStyle(event.kind, attributed);
  }

  switch (event.kind) {
    case "WIDE":
      return {
        radius: 3.42,
        fill: "rgb(220 38 38)",
        stroke: "rgb(127 29 29)",
        strokeWidth: 0.72,
        shadowBlur: 4.5,
        shadowColor: "rgba(0,0,0,0.45)",
      };
    case "SHOT":
      return {
        radius: 2.78,
        fill: "rgba(248 250 252, 0.96)",
        stroke: "rgb(29 78 216)",
        strokeWidth: 0.52,
        shadowBlur: 2.8,
        shadowColor: "rgba(0,0,0,0.28)",
      };
    case "TURNOVER_WON":
      return {
        radius: 2.55,
        fill: "rgb(6 182 212)",
        stroke: "rgb(14 116 144)",
        strokeWidth: 0.5,
        shadowBlur: 2.5,
        shadowColor: "rgba(0,0,0,0.26)",
      };
    case "TURNOVER_LOST":
      return {
        radius: 2.55,
        fill: "rgb(251 113 133)",
        stroke: "rgb(190 18 60)",
        strokeWidth: 0.5,
        shadowBlur: 2.5,
        shadowColor: "rgba(0,0,0,0.26)",
      };
    case "KICKOUT_WON":
      return {
        radius: 2.45,
        fill: "rgb(56 189 248)",
        stroke: "rgb(3 105 161)",
        strokeWidth: 0.48,
        shadowBlur: 2.2,
        shadowColor: "rgba(0,0,0,0.22)",
      };
    case "KICKOUT_LOST":
      return {
        radius: 2.45,
        fill: "rgb(165 180 252)",
        stroke: "rgb(67 56 202)",
        strokeWidth: 0.48,
        shadowBlur: 2.2,
        shadowColor: "rgba(0,0,0,0.22)",
      };
    case "FREE_WON":
      return {
        radius: 2.4,
        fill: "rgb(251 191 36)",
        stroke: "rgb(180 83 9)",
        strokeWidth: 0.46,
        shadowBlur: 2,
        shadowColor: "rgba(0,0,0,0.22)",
      };
    case "FREE_CONCEDED":
      return {
        radius: 2.4,
        fill: "rgb(168 162 158)",
        stroke: "rgb(87 83 78)",
        strokeWidth: 0.46,
        shadowBlur: 2,
        shadowColor: "rgba(0,0,0,0.22)",
      };
    default: {
      const _x: never = event.kind;
      return _x;
    }
  }
}

function applyDensity(
  s: StatsEventMarkerStyle,
  density: "comfortable" | "compact",
  kind: EmphasisKind,
): StatsEventMarkerStyle {
  if (density === "comfortable") return s;
  const wideKeep = kind === "wide" ? 0.94 : 1;
  const mul = 0.86 * wideKeep;
  return {
    ...s,
    radius: s.radius * mul,
    strokeWidth: Math.max(0.28, s.strokeWidth * 0.92),
    shadowBlur: s.shadowBlur * 0.88,
  };
}

export function getStatsEventMarkerStyle(
  event: StatsLoggedEvent,
  opts?: StatsMarkerStyleOptions,
): StatsEventMarkerStyle {
  const base = liveMarkerStyle(event);
  const mode = opts?.reviewMode ?? "live";
  const ek = emphasisKind(event);
  const afterReview =
    mode === "live" ? base : applyReviewEmphasis(base, mode, ek);
  const density = opts?.density ?? "comfortable";
  return applyDensity(afterReview, density, ek);
}
