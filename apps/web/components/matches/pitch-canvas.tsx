"use client";

import { useId, useMemo, type ReactNode } from "react";

import {
  getPitchConfig,
  LEGACY_PITCH_HIGHLIGHT_INNER,
  mapPitchHighlightToInner,
  type PitchHighlightRect,
  type PitchMarking,
  type PitchSport,
} from "@/config/pitchConfig";
import {
  boardGrass,
  boardGrassLightGaelic,
  boardHighlightZone,
  boardStripes,
} from "@/lib/board-tokens";
import { cn } from "@pitchside/utils";

export type { PitchHighlightRect };

export type PitchCanvasProps = {
  sport: PitchSport;
  className?: string;
  /** Optional highlight overlay (legacy 160×100 inner space; mapped when pitch `inner` differs). */
  pitchHighlight?: PitchHighlightRect | null;
};

function markingSkipsLineGlow(m: PitchMarking): boolean {
  if (m.kind === "text") return true;
  return m.kind === "path" && m.skipLineGlow === true;
}

function PitchMarkingEl(props: { marking: PitchMarking }): ReactNode {
  const { marking } = props;
  switch (marking.kind) {
    case "rect":
      return (
        <rect
          x={marking.x}
          y={marking.y}
          width={marking.w}
          height={marking.h}
          fill={marking.fill ?? "none"}
          stroke={marking.stroke}
          strokeWidth={marking.strokeWidth}
        />
      );
    case "line":
      return (
        <line
          x1={marking.x1}
          y1={marking.y1}
          x2={marking.x2}
          y2={marking.y2}
          stroke={marking.stroke}
          strokeWidth={marking.strokeWidth}
          strokeDasharray={marking.strokeDasharray}
        />
      );
    case "circle":
      return (
        <circle
          cx={marking.cx}
          cy={marking.cy}
          r={marking.r}
          fill={marking.fill ?? "none"}
          stroke={marking.stroke ?? "none"}
          strokeWidth={marking.strokeWidth ?? 0}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx={marking.cx}
          cy={marking.cy}
          rx={marking.rx}
          ry={marking.ry}
          fill={marking.fill ?? "none"}
          stroke={marking.stroke}
          strokeWidth={marking.strokeWidth}
        />
      );
    case "path":
      return (
        <path
          d={marking.d}
          fill={marking.fill ?? "none"}
          stroke={marking.stroke}
          strokeWidth={marking.strokeWidth}
          opacity={marking.opacity ?? 1}
          strokeLinecap={marking.strokeLinecap ?? "butt"}
          strokeDasharray={marking.strokeDasharray}
        />
      );
    case "text":
      return (
        <text
          x={marking.x}
          y={marking.y}
          fontSize={marking.fontSize}
          fill={marking.fill}
          fontWeight={marking.fontWeight ?? "600"}
          textAnchor={marking.textAnchor ?? "start"}
          opacity={marking.opacity ?? 1}
          dominantBaseline="middle"
          paintOrder="stroke fill"
          stroke="rgba(0,0,0,0.42)"
          strokeWidth={0.22}
          style={{ fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}
        >
          {marking.text}
        </text>
      );
    default:
      return null;
  }
}

/**
 * Static pitch grass + line markings. Interactive layers (markers, drawings)
 * stay in separate overlays with normalized 0–1 coordinates.
 */
export function PitchCanvas({
  sport,
  className,
  pitchHighlight,
}: PitchCanvasProps) {
  const reactId = useId();
  const uid = useMemo(
    () => reactId.replace(/[^a-zA-Z0-9_-]/g, ""),
    [reactId],
  );

  const { viewBox, markings, inner } = getPitchConfig(sport);
  const markingsWithGlow = markings.filter((m) => !markingSkipsLineGlow(m));
  const markingsPlain = markings.filter((m) => markingSkipsLineGlow(m));

  const L = LEGACY_PITCH_HIGHLIGHT_INNER;
  const mappedHighlight =
    pitchHighlight &&
    (inner.x !== L.x ||
      inner.y !== L.y ||
      inner.w !== L.w ||
      inner.h !== L.h)
      ? mapPitchHighlightToInner(pitchHighlight, inner)
      : pitchHighlight;

  const gradId = `pitchGrad-${uid}`;
  const fineId = `pitchGrassFine-${uid}`;
  const radId = `pitchRadialLight-${uid}`;
  const vigId = `pitchVignette-${uid}`;
  const gaelicTuftId = `pitchGaelicTuft-${uid}`;
  const gaelicLinePaintId = `pitchGaelicLinePaint-${uid}`;

  /** Gaelic football is the master board look; soccer + hurling share the same canvas treatment. */
  const grass = boardGrass.gaelic;
  const grassLight = boardGrassLightGaelic;

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 z-0 h-full w-full", className)}
      viewBox={`0 0 ${viewBox.w} ${viewBox.h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={grass.top} />
          <stop offset="50%" stopColor={grass.mid} />
          <stop offset="100%" stopColor={grass.bottom} />
        </linearGradient>
        <pattern
          id={fineId}
          patternUnits="userSpaceOnUse"
          width="3"
          height="3"
        >
          <circle
            cx="0.8"
            cy="1.2"
            r="0.35"
            fill="rgb(255,255,255)"
            opacity={boardStripes.fineWhiteDot}
          />
          <circle
            cx="2.2"
            cy="2"
            r="0.25"
            fill="rgb(0,0,0)"
            opacity={boardStripes.fineDarkDot}
          />
        </pattern>
        <radialGradient id={radId} cx="50%" cy="30%" r="72%">
          <stop
            offset="0%"
            stopColor="rgb(255,255,255)"
            stopOpacity={grassLight.highlightPeak}
          />
          <stop
            offset="42%"
            stopColor="rgb(255,255,255)"
            stopOpacity={grassLight.highlightMid}
          />
          <stop
            offset="100%"
            stopColor="rgb(255,255,255)"
            stopOpacity="0"
          />
        </radialGradient>
        <radialGradient id={vigId} cx="50%" cy="50%" r="78%">
          <stop offset="52%" stopColor="rgb(0,0,0)" stopOpacity="0" />
          <stop
            offset="100%"
            stopColor="rgb(0,0,0)"
            stopOpacity={grassLight.vignetteEdge}
          />
        </radialGradient>
        <pattern
          id={gaelicTuftId}
          patternUnits="userSpaceOnUse"
          width={10}
          height={10}
        >
          <path
            d="M2 10 V6.5 M5 10 V5.2 M8 10 V6.8"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={0.35}
            strokeLinecap="round"
          />
          <path
            d="M0.5 4 L2 2.5 M4 3.5 L5.5 1.8 M7.5 4 L9 2.6"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={0.28}
            strokeLinecap="round"
          />
        </pattern>
        <filter
          id={gaelicLinePaintId}
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.14" result="blur" />
          <feOffset dx="0" dy="0.12" in="blur" result="off" />
          <feFlood
            floodColor="rgb(255,255,255)"
            floodOpacity="0.22"
            result="flood"
          />
          <feComposite in="flood" in2="off" operator="in" result="sh" />
          <feMerge>
            <feMergeNode in="sh" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={viewBox.w} height={viewBox.h} fill={`url(#${gradId})`} />
      <rect
        width={viewBox.w}
        height={viewBox.h}
        fill={`url(#${fineId})`}
        opacity={boardStripes.fineGaaOpacity}
      />
      <rect
        width={viewBox.w}
        height={viewBox.h}
        fill={`url(#${gaelicTuftId})`}
        opacity={boardStripes.gaelicBladeOpacity}
      />
      <rect width={viewBox.w} height={viewBox.h} fill={`url(#${radId})`} />
      <g>
        <g filter={`url(#${gaelicLinePaintId})`}>
          {markingsWithGlow.map((m, i) => (
            <PitchMarkingEl key={`${sport}-glow-${i}`} marking={m} />
          ))}
        </g>
        <g>
          {markingsPlain.map((m, i) => (
            <PitchMarkingEl key={`${sport}-plain-${i}`} marking={m} />
          ))}
        </g>
      </g>
      <rect width={viewBox.w} height={viewBox.h} fill={`url(#${vigId})`} />
      {mappedHighlight ? (
        <rect
          x={mappedHighlight.x}
          y={mappedHighlight.y}
          width={mappedHighlight.w}
          height={mappedHighlight.h}
          fill={boardHighlightZone.fill}
          stroke={boardHighlightZone.stroke}
          strokeWidth={1.1}
          rx={1.5}
        />
      ) : null}
    </svg>
  );
}
