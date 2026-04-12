"use client";

import { useId, useMemo, useState } from "react";

import { cn } from "@pitchside/utils";

/**
 * FIFA pitch model: length 105 m (Y), width 68 m (X). ViewBox matches metres for easy scaling.
 * Y = 0 at the top goal line, Y = 105 at the bottom goal line (own goal at bottom in this view).
 */

const PITCH_W = 68;
const PITCH_L = 105;

/** IFAB dimensions (m). */
const PENALTY_WIDTH = 40.32;
const PENALTY_DEPTH = 16.5;
const GOAL_AREA_WIDTH = 18.32;
const GOAL_AREA_DEPTH = 5.5;
const CENTRE_CIRCLE_R = 9.15;
const PENALTY_MARK = 11;
const PENALTY_ARC_R = 9.15;
const GOAL_WIDTH = 7.32;

const rnd = (n: number) => Math.round(n * 1000) / 1000;

function penaltyArcPath(opts: {
  spotY: number;
  boxEdgeY: number;
  cx: number;
  bulgeTowardIncreasingY: boolean;
}): string {
  const { spotY, boxEdgeY, cx, bulgeTowardIncreasingY } = opts;
  const dy = Math.abs(boxEdgeY - spotY);
  if (PENALTY_ARC_R * PENALTY_ARC_R <= dy * dy) {
    const fallback = PENALTY_ARC_R * 0.75;
    return bulgeTowardIncreasingY
      ? `M ${rnd(cx - fallback)} ${rnd(boxEdgeY)} A ${PENALTY_ARC_R} ${PENALTY_ARC_R} 0 0 1 ${rnd(cx + fallback)} ${rnd(boxEdgeY)}`
      : `M ${rnd(cx - fallback)} ${rnd(boxEdgeY)} A ${PENALTY_ARC_R} ${PENALTY_ARC_R} 0 0 0 ${rnd(cx + fallback)} ${rnd(boxEdgeY)}`;
  }
  const halfChord = Math.sqrt(PENALTY_ARC_R * PENALTY_ARC_R - dy * dy);
  const x0 = cx - halfChord;
  const x1 = cx + halfChord;
  if (bulgeTowardIncreasingY) {
    return `M ${rnd(x0)} ${rnd(boxEdgeY)} A ${PENALTY_ARC_R} ${PENALTY_ARC_R} 0 0 1 ${rnd(x1)} ${rnd(boxEdgeY)}`;
  }
  return `M ${rnd(x0)} ${rnd(boxEdgeY)} A ${PENALTY_ARC_R} ${PENALTY_ARC_R} 0 0 0 ${rnd(x1)} ${rnd(boxEdgeY)}`;
}

export type SoccerPitchPlayer = {
  /** Shirt number (1–99). */
  number: number;
  /** Optional display name for hover / a11y. */
  name?: string;
  /** Normalised X on pitch [0,1], 0 = left touchline, 1 = right. */
  nx: number;
  /** Normalised Y on pitch [0,1], 0 = top goal line, 1 = bottom goal line. */
  ny: number;
};

/**
 * Default 15-a-side layout matching the requested grouping:
 * - 1 bottom-left near goal
 * - 3, 6, 11, 14 on the halfway (horizontal) line
 * - 8 above centre, 9 below centre circle
 * - 2, 5, 10, 13 top row; 4, 7, 12, 15 bottom outfield row
 *
 * Tweak `nx` / `ny` if you align to a reference screenshot pixel-perfect.
 */
export const DEFAULT_SOCCER_TACTICS_FORMATION: readonly SoccerPitchPlayer[] = [
  { number: 1, name: "Goalkeeper", nx: 0.14, ny: 0.94 },
  { number: 2, name: "Left back", nx: 0.18, ny: 0.12 },
  { number: 3, name: "Left mid", nx: 0.16, ny: 0.5 },
  { number: 4, name: "Left centre", nx: 0.22, ny: 0.82 },
  { number: 5, name: "Centre back", nx: 0.36, ny: 0.11 },
  { number: 6, name: "Centre mid", nx: 0.34, ny: 0.5 },
  { number: 7, name: "Striker left", nx: 0.5, ny: 0.83 },
  { number: 8, name: "Attacking mid", nx: 0.5, ny: 0.38 },
  { number: 9, name: "Centre forward", nx: 0.5, ny: 0.61 },
  { number: 10, name: "Centre back", nx: 0.64, ny: 0.11 },
  { number: 11, name: "Right mid", nx: 0.52, ny: 0.5 },
  { number: 12, name: "Right centre", nx: 0.78, ny: 0.82 },
  { number: 13, name: "Right back", nx: 0.82, ny: 0.13 },
  { number: 14, name: "Wide mid", nx: 0.68, ny: 0.5 },
  { number: 15, name: "Striker right", nx: 0.88, ny: 0.84 },
] as const;

export type SoccerPitchTacticsProps = {
  className?: string;
  /** Shown above the pitch (e.g. "4-3-3"). */
  formationLabel?: string;
  /** Sport label for future tabs (Gaelic compare, etc.). */
  sportLabel?: string;
  /** Override default player positions. */
  players?: readonly SoccerPitchPlayer[];
  /** Subtle vertical mow stripes on grass. */
  showGrassStripes?: boolean;
  /** Token radius in metres (SVG user units). */
  playerRadius?: number;
};

function toPitchCoords(nx: number, ny: number) {
  return { x: nx * PITCH_W, y: ny * PITCH_L };
}

export function SoccerPitchTactics({
  className,
  formationLabel = "Custom formation",
  sportLabel = "Soccer",
  players = DEFAULT_SOCCER_TACTICS_FORMATION,
  showGrassStripes = true,
  playerRadius = 2.35,
}: SoccerPitchTacticsProps) {
  const reactId = useId();
  const uid = useMemo(
    () => reactId.replace(/[^a-zA-Z0-9_-]/g, ""),
    [reactId],
  );

  const grassGrad = `soccerGrass-${uid}`;
  const stripePat = `soccerStripe-${uid}`;
  const tokenShadow = `soccerTokShadow-${uid}`;

  const cx = PITCH_W / 2;
  const midY = PITCH_L / 2;
  const penX = (PITCH_W - PENALTY_WIDTH) / 2;
  const penTop = 0;
  const penBotY = PITCH_L - PENALTY_DEPTH;
  const sixX = (PITCH_W - GOAL_AREA_WIDTH) / 2;
  const spotTopY = PENALTY_MARK;
  const spotBotY = PITCH_L - PENALTY_MARK;
  const arcTop = penaltyArcPath({
    spotY: spotTopY,
    boxEdgeY: PENALTY_DEPTH,
    cx,
    bulgeTowardIncreasingY: true,
  });
  const arcBot = penaltyArcPath({
    spotY: spotBotY,
    boxEdgeY: penBotY,
    cx,
    bulgeTowardIncreasingY: false,
  });

  const [hovered, setHovered] = useState<number | null>(null);

  const goalDepth = 1.35;
  const goalHalf = GOAL_WIDTH / 2;

  return (
    <div
      className={cn(
        "w-full max-w-3xl rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700 dark:bg-slate-950 dark:ring-white/[0.06]",
        className,
      )}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {sportLabel}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            {formationLabel}
          </h2>
        </div>
        {hovered != null ? (
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            #{hovered}{" "}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              {players.find((p) => p.number === hovered)?.name ?? ""}
            </span>
          </p>
        ) : null}
      </header>

      <div className="relative w-full overflow-hidden rounded-xl border border-slate-200/80 bg-slate-900/[0.04] dark:border-slate-700 dark:bg-black/30">
        <div
          className="w-full"
          style={{ aspectRatio: `${PITCH_W} / ${PITCH_L}` }}
        >
          <svg
            viewBox={`0 0 ${PITCH_W} ${PITCH_L}`}
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Soccer pitch with FIFA markings and player positions"
          >
            <defs>
              <linearGradient id={grassGrad} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a4d2e" />
                <stop offset="50%" stopColor="#1b5c36" />
                <stop offset="100%" stopColor="#164a2c" />
              </linearGradient>
              {showGrassStripes ? (
                <pattern
                  id={stripePat}
                  patternUnits="userSpaceOnUse"
                  width={4}
                  height={PITCH_L}
                >
                  <rect width={2} height={PITCH_L} fill="rgb(255 255 255 / 0.03)" />
                  <rect
                    x={2}
                    width={2}
                    height={PITCH_L}
                    fill="rgb(0 0 0 / 0.04)"
                  />
                </pattern>
              ) : null}
              <filter
                id={tokenShadow}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feDropShadow
                  dx="0"
                  dy="0.15"
                  stdDeviation="0.25"
                  floodColor="rgb(0 0 0 / 0.35)"
                />
              </filter>
            </defs>

            <rect width={PITCH_W} height={PITCH_L} fill={`url(#${grassGrad})`} />
            {showGrassStripes ? (
              <rect
                width={PITCH_W}
                height={PITCH_L}
                fill={`url(#${stripePat})`}
                opacity={0.85}
              />
            ) : null}

            {/* Touchline */}
            <rect
              x={0}
              y={0}
              width={PITCH_W}
              height={PITCH_L}
              fill="none"
              stroke="rgb(255 255 255 / 0.95)"
              strokeWidth={0.45}
            />

            {/* Penalty areas */}
            <rect
              x={penX}
              y={penTop}
              width={PENALTY_WIDTH}
              height={PENALTY_DEPTH}
              fill="none"
              stroke="rgb(255 255 255 / 0.92)"
              strokeWidth={0.38}
            />
            <rect
              x={penX}
              y={penBotY}
              width={PENALTY_WIDTH}
              height={PENALTY_DEPTH}
              fill="none"
              stroke="rgb(255 255 255 / 0.92)"
              strokeWidth={0.38}
            />

            {/* Goal areas (6-yard) */}
            <rect
              x={sixX}
              y={0}
              width={GOAL_AREA_WIDTH}
              height={GOAL_AREA_DEPTH}
              fill="none"
              stroke="rgb(255 255 255 / 0.82)"
              strokeWidth={0.32}
            />
            <rect
              x={sixX}
              y={PITCH_L - GOAL_AREA_DEPTH}
              width={GOAL_AREA_WIDTH}
              height={GOAL_AREA_DEPTH}
              fill="none"
              stroke="rgb(255 255 255 / 0.82)"
              strokeWidth={0.32}
            />

            {/* Penalty arcs */}
            <path
              d={arcTop}
              fill="none"
              stroke="rgb(255 255 255 / 0.88)"
              strokeWidth={0.32}
              strokeLinecap="round"
            />
            <path
              d={arcBot}
              fill="none"
              stroke="rgb(255 255 255 / 0.88)"
              strokeWidth={0.32}
              strokeLinecap="round"
            />

            {/* Penalty spots */}
            <circle
              cx={cx}
              cy={spotTopY}
              r={0.22}
              fill="rgb(255 255 255 / 0.95)"
              stroke="rgb(0 0 0 / 0.15)"
              strokeWidth={0.04}
            />
            <circle
              cx={cx}
              cy={spotBotY}
              r={0.22}
              fill="rgb(255 255 255 / 0.95)"
              stroke="rgb(0 0 0 / 0.15)"
              strokeWidth={0.04}
            />

            {/* Halfway line */}
            <line
              x1={0}
              y1={midY}
              x2={PITCH_W}
              y2={midY}
              stroke="rgb(255 255 255 / 0.95)"
              strokeWidth={0.42}
            />

            {/* Centre circle + spot */}
            <circle
              cx={cx}
              cy={midY}
              r={CENTRE_CIRCLE_R}
              fill="none"
              stroke="rgb(255 255 255 / 0.92)"
              strokeWidth={0.38}
            />
            <circle
              cx={cx}
              cy={midY}
              r={0.22}
              fill="rgb(255 255 255 / 0.95)"
            />

            {/* Goals (simple nets past end line) */}
            <rect
              x={cx - goalHalf}
              y={-goalDepth}
              width={GOAL_WIDTH}
              height={goalDepth}
              fill="rgb(15 23 42 / 0.35)"
              stroke="rgb(255 255 255 / 0.5)"
              strokeWidth={0.12}
            />
            <rect
              x={cx - goalHalf}
              y={PITCH_L}
              width={GOAL_WIDTH}
              height={goalDepth}
              fill="rgb(15 23 42 / 0.35)"
              stroke="rgb(255 255 255 / 0.5)"
              strokeWidth={0.12}
            />
            {/* Goal frame (posts + crossbar) — top */}
            <line
              x1={cx - goalHalf}
              y1={0}
              x2={cx - goalHalf}
              y2={0.55}
              stroke="rgb(255 255 255 / 0.95)"
              strokeWidth={0.28}
              strokeLinecap="round"
            />
            <line
              x1={cx + goalHalf}
              y1={0}
              x2={cx + goalHalf}
              y2={0.55}
              stroke="rgb(255 255 255 / 0.95)"
              strokeWidth={0.28}
              strokeLinecap="round"
            />
            <line
              x1={cx - goalHalf}
              y1={0.42}
              x2={cx + goalHalf}
              y2={0.42}
              stroke="rgb(255 255 255 / 0.95)"
              strokeWidth={0.28}
              strokeLinecap="round"
            />
            {/* Goal frame — bottom */}
            <line
              x1={cx - goalHalf}
              y1={PITCH_L}
              x2={cx - goalHalf}
              y2={PITCH_L - 0.55}
              stroke="rgb(255 255 255 / 0.95)"
              strokeWidth={0.28}
              strokeLinecap="round"
            />
            <line
              x1={cx + goalHalf}
              y1={PITCH_L}
              x2={cx + goalHalf}
              y2={PITCH_L - 0.55}
              stroke="rgb(255 255 255 / 0.95)"
              strokeWidth={0.28}
              strokeLinecap="round"
            />
            <line
              x1={cx - goalHalf}
              y1={PITCH_L - 0.42}
              x2={cx + goalHalf}
              y2={PITCH_L - 0.42}
              stroke="rgb(255 255 255 / 0.95)"
              strokeWidth={0.28}
              strokeLinecap="round"
            />

            {/* Players */}
            <g aria-label="Players">
              {players.map((p) => {
                const { x, y } = toPitchCoords(p.nx, p.ny);
                const label = p.name
                  ? `#${p.number} ${p.name}`
                  : `Player ${p.number}`;
                return (
                  <g
                    key={p.number}
                    transform={`translate(${rnd(x)},${rnd(y)})`}
                    className="cursor-default"
                    onMouseEnter={() => setHovered(p.number)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{label}</title>
                    <circle
                      r={playerRadius}
                      fill="rgb(250 250 250)"
                      stroke="rgb(15 23 42 / 0.55)"
                      strokeWidth={0.18}
                      filter={`url(#${tokenShadow})`}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgb(15 23 42)"
                      fontSize={playerRadius * 1.25}
                      fontWeight={800}
                      fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                      style={{ userSelect: "none" }}
                    >
                      {p.number}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        FIFA / IFAB proportions · Hover a token for number and name
      </p>
    </div>
  );
}
