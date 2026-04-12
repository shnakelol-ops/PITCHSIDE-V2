import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";

/**
 * Thin view derived from `StatsLoggedEvent` for Konva circles only.
 * No duplicate coordinate math — positions still come from `boardNormToWorld`.
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

type EmphasisKind = "wide" | "shot" | "turnover" | "score" | "field_other";

function emphasisKind(event: StatsLoggedEvent): EmphasisKind {
  if (event.domain === "score") return "score";
  if (event.fieldType === "wide") return "wide";
  if (event.fieldType === "shot") return "shot";
  if (event.fieldType === "turnover_won" || event.fieldType === "turnover_lost") {
    return "turnover";
  }
  return "field_other";
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
    score: 1.16,
    field_other: 1.06,
  };
  const kindStroke: Record<EmphasisKind, number> = {
    wide: 1.32,
    shot: 1.18,
    turnover: 1.2,
    score: 1.12,
    field_other: 1.06,
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

function scoreStyle(
  scoreType: "goal" | "point" | "two_point",
  attributed: boolean,
): StatsEventMarkerStyle {
  const soft = !attributed;
  switch (scoreType) {
    case "goal":
      return {
        radius: soft ? 2.95 : 3.1,
        fill: soft ? "rgba(250, 204, 21, 0.82)" : "rgb(250 204 21)",
        stroke: soft ? "rgba(146, 64, 14, 0.55)" : "rgb(146 64 14)",
        strokeWidth: soft ? 0.38 : 0.5,
        shadowBlur: soft ? 2 : 4,
        shadowColor: "rgba(0,0,0,0.35)",
      };
    case "point":
      return {
        radius: soft ? 2.7 : 2.85,
        fill: soft ? "rgba(236, 253, 245, 0.88)" : "rgb(236 253 245)",
        stroke: soft ? "rgba(4, 120, 87, 0.45)" : "rgb(4 120 87)",
        strokeWidth: soft ? 0.4 : 0.55,
        shadowBlur: soft ? 2 : 3,
        shadowColor: "rgba(0,0,0,0.25)",
      };
    case "two_point":
      return {
        radius: soft ? 2.85 : 3,
        fill: soft ? "rgba(237, 233, 254, 0.88)" : "rgb(237 233 254)",
        stroke: soft ? "rgba(109, 40, 217, 0.5)" : "rgb(109 40 217)",
        strokeWidth: soft ? 0.38 : 0.5,
        shadowBlur: soft ? 2 : 4,
        shadowColor: "rgba(0,0,0,0.3)",
      };
  }
}

function liveMarkerStyle(event: StatsLoggedEvent): StatsEventMarkerStyle {
  if (event.domain === "score") {
    const attributed = event.scorerId != null && event.scorerId.length > 0;
    return scoreStyle(event.scoreType, attributed);
  }

  if (event.fieldType === "wide") {
    return {
      radius: 3,
      fill: "rgb(239 68 68)",
      stroke: "rgb(153 27 27)",
      strokeWidth: 0.6,
      shadowBlur: 4,
      shadowColor: "rgba(0,0,0,0.45)",
    };
  }

  if (event.fieldType === "shot") {
    return {
      radius: 2.65,
      fill: "rgba(248 250 252, 0.96)",
      stroke: "rgb(37 99 235)",
      strokeWidth: 0.55,
      shadowBlur: 3,
      shadowColor: "rgba(0,0,0,0.28)",
    };
  }

  return {
    radius: 2.35,
    fill: "rgba(254 243 199, 0.95)",
    stroke: "rgba(180, 83, 9, 0.85)",
    strokeWidth: 0.45,
    shadowBlur: 2,
    shadowColor: "rgba(0,0,0,0.22)",
  };
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
  const kind = emphasisKind(event);
  const afterReview =
    mode === "live" ? base : applyReviewEmphasis(base, mode, kind);
  const density = opts?.density ?? "comfortable";
  return applyDensity(afterReview, density, kind);
}
