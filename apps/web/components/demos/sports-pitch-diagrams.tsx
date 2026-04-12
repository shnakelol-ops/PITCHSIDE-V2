"use client";

import { useId, useMemo, useState } from "react";

import { cn } from "@pitchside/utils";

/**
 * Normalised coordinates on the inner pitch: x along length (0 = left goal line),
 * y across width (0 = top touchline, 1 = bottom). Same formation on every sport.
 * Tuned to match a classic 4–4–2-style spread: 1 keeper left, 9 central, 15 high left wing.
 */
const FORMATION: readonly { label: string; x: number; y: number }[] = [
  { label: "1", x: 0.085, y: 0.5 },
  { label: "2", x: 0.2, y: 0.22 },
  { label: "3", x: 0.22, y: 0.36 },
  { label: "4", x: 0.22, y: 0.5 },
  { label: "5", x: 0.22, y: 0.64 },
  { label: "6", x: 0.2, y: 0.78 },
  { label: "7", x: 0.36, y: 0.14 },
  { label: "8", x: 0.4, y: 0.4 },
  { label: "9", x: 0.5, y: 0.5 },
  { label: "10", x: 0.6, y: 0.4 },
  { label: "11", x: 0.36, y: 0.86 },
  { label: "12", x: 0.58, y: 0.16 },
  { label: "13", x: 0.52, y: 0.26 },
  { label: "14", x: 0.62, y: 0.26 },
  { label: "15", x: 0.06, y: 0.12 },
] as const;

type SportTab = "soccer" | "gaelic" | "hurling";

const TABS: { id: SportTab; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic football" },
  { id: "hurling", label: "Hurling" },
];

/** Inner pitch in user space (goals left/right). */
const INNER = { x: 8, y: 8, w: 144, h: 84 } as const;
const VB = { w: 160, h: 100 } as const;

function toInner(px: number, py: number) {
  return {
    x: INNER.x + px * INNER.w,
    y: INNER.y + py * INNER.h,
  };
}

function PlayerMarkers(props: { filterId?: string; r?: number }) {
  const r = props.r ?? 3.1;
  const filt = props.filterId;
  return (
    <g aria-label="Player positions">
      {FORMATION.map((p) => {
        const { x, y } = toInner(p.x, p.y);
        return (
          <g key={p.label} transform={`translate(${x},${y})`}>
            <circle
              r={r}
              fill="rgb(250 250 250)"
              stroke="rgb(15 23 42 / 0.2)"
              strokeWidth={0.35}
              filter={filt ? `url(#${filt})` : undefined}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgb(15 23 42)"
              fontSize={r * 1.35}
              fontWeight={700}
              fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
              style={{ userSelect: "none" }}
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** FIFA-style soccer: penalty areas, 6-yard, D arcs, spots, halfway, centre circle. */
function SoccerPitchSvg(props: { grassId: string; tokenShadowId: string }) {
  const ix = INNER.x;
  const iy = INNER.y;
  const iw = INNER.w;
  const ih = INNER.h;
  const cx = ix + iw / 2;
  const cy = iy + ih / 2;

  const penW = iw * (40.32 / 68);
  const penH = iw * (16.5 / 105);
  const sixW = iw * (18.32 / 68);
  const sixH = iw * (5.5 / 105);
  const penTop = cy - penW / 2;
  const sixTop = cy - sixW / 2;
  const arcR = (9.15 / 105) * iw;
  const spotL = ix + iw * (11 / 105);
  const spotR = ix + iw - iw * (11 / 105);
  const penEdgeL = ix + penH;
  const penEdgeR = ix + iw - penH;
  const dxL = penEdgeL - spotL;
  const dxR = spotR - penEdgeR;
  const dyL =
    dxL * dxL < arcR * arcR ? Math.sqrt(arcR * arcR - dxL * dxL) : arcR * 0.85;
  const dyR =
    dxR * dxR < arcR * arcR ? Math.sqrt(arcR * arcR - dxR * dxR) : arcR * 0.85;

  const goalDepth = 2.8;
  const goalHalfW = ih * 0.068;

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="h-auto w-full max-h-[min(72vh,520px)]"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Soccer pitch with standard markings"
    >
      <defs>
        <linearGradient id={props.grassId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a4d2e" />
          <stop offset="55%" stopColor="#1b5c36" />
          <stop offset="100%" stopColor="#176e3a" />
        </linearGradient>
        <filter
          id={props.tokenShadowId}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feDropShadow
            dx="0"
            dy="0.6"
            stdDeviation="0.8"
            floodColor="rgb(0 0 0 / 0.35)"
          />
        </filter>
      </defs>
      <rect width={VB.w} height={VB.h} fill={`url(#${props.grassId})`} rx={4} />
      <rect
        x={ix}
        y={iy}
        width={iw}
        height={ih}
        fill="none"
        stroke="rgb(255 255 255 / 0.92)"
        strokeWidth={0.65}
      />
      <line
        x1={cx}
        y1={iy}
        x2={cx}
        y2={iy + ih}
        stroke="rgb(255 255 255 / 0.92)"
        strokeWidth={0.55}
      />
      <circle
        cx={cx}
        cy={cy}
        r={ih * 0.19}
        fill="none"
        stroke="rgb(255 255 255 / 0.9)"
        strokeWidth={0.5}
      />
      <circle cx={cx} cy={cy} r={0.55} fill="rgb(255 255 255 / 0.95)" />

      <rect
        x={ix}
        y={penTop}
        width={penH}
        height={penW}
        fill="none"
        stroke="rgb(255 255 255 / 0.88)"
        strokeWidth={0.48}
      />
      <rect
        x={ix + iw - penH}
        y={penTop}
        width={penH}
        height={penW}
        fill="none"
        stroke="rgb(255 255 255 / 0.88)"
        strokeWidth={0.48}
      />
      <rect
        x={ix}
        y={sixTop}
        width={sixH}
        height={sixW}
        fill="none"
        stroke="rgb(255 255 255 / 0.78)"
        strokeWidth={0.4}
      />
      <rect
        x={ix + iw - sixH}
        y={sixTop}
        width={sixH}
        height={sixW}
        fill="none"
        stroke="rgb(255 255 255 / 0.78)"
        strokeWidth={0.4}
      />
      <line
        x1={ix + penH}
        y1={penTop + penW}
        x2={ix + penH}
        y2={penTop}
        stroke="rgb(255 255 255 / 0.82)"
        strokeWidth={0.42}
      />
      <line
        x1={ix + iw - penH}
        y1={penTop + penW}
        x2={ix + iw - penH}
        y2={penTop}
        stroke="rgb(255 255 255 / 0.82)"
        strokeWidth={0.42}
      />

      <path
        d={`M ${penEdgeL} ${cy - dyL} A ${arcR} ${arcR} 0 0 1 ${penEdgeL} ${cy + dyL}`}
        fill="none"
        stroke="rgb(255 255 255 / 0.82)"
        strokeWidth={0.42}
      />
      <path
        d={`M ${penEdgeR} ${cy - dyR} A ${arcR} ${arcR} 0 0 0 ${penEdgeR} ${cy + dyR}`}
        fill="none"
        stroke="rgb(255 255 255 / 0.82)"
        strokeWidth={0.42}
      />

      <circle cx={spotL} cy={cy} r={0.45} fill="rgb(255 255 255 / 0.95)" />
      <circle cx={spotR} cy={cy} r={0.45} fill="rgb(255 255 255 / 0.95)" />

      <rect
        x={ix - goalDepth}
        y={cy - goalHalfW}
        width={goalDepth}
        height={goalHalfW * 2}
        fill="rgb(15 23 42 / 0.35)"
        stroke="rgb(255 255 255 / 0.5)"
        strokeWidth={0.25}
      />
      <rect
        x={ix + iw}
        y={cy - goalHalfW}
        width={goalDepth}
        height={goalHalfW * 2}
        fill="rgb(15 23 42 / 0.35)"
        stroke="rgb(255 255 255 / 0.5)"
        strokeWidth={0.25}
      />
      <line
        x1={ix}
        y1={cy - goalHalfW}
        x2={ix}
        y2={cy + goalHalfW}
        stroke="rgb(255 255 255 / 0.95)"
        strokeWidth={0.5}
      />
      <line
        x1={ix + iw}
        y1={cy - goalHalfW}
        x2={ix + iw}
        y2={cy + goalHalfW}
        stroke="rgb(255 255 255 / 0.95)"
        strokeWidth={0.5}
      />

      <PlayerMarkers filterId={props.tokenShadowId} />
    </svg>
  );
}

/** GAA landscape: 13 / 20 / 45 m lines, large scoring rectangles, centre, posts. */
function GaaPitchSvg(props: {
  grassId: string;
  caption: string;
  tokenShadowId: string;
}) {
  const ix = INNER.x;
  const iy = INNER.y;
  const iw = INNER.w;
  const ih = INNER.h;
  const xR = ix + iw;
  const yB = iy + ih;
  const cx = ix + iw / 2;
  const cy = iy + ih / 2;

  const t13 = 13 / 145;
  const t20 = 20 / 145;
  const t45 = 45 / 145;
  const x13a = ix + t13 * iw;
  const x13b = xR - t13 * iw;
  const x20a = ix + t20 * iw;
  const x20b = xR - t20 * iw;
  const x45a = ix + t45 * iw;
  const x45b = xR - t45 * iw;
  const xMid = ix + iw / 2;

  const largeD = (13 / 145) * iw;
  const largeW = (19 / 90) * ih;
  const smallD = (4.5 / 145) * iw;
  const smallW = (14 / 90) * ih;
  const yLargeT = cy - largeW / 2;
  const ySmallT = cy - smallW / 2;
  const rCentre = (3 / 145) * iw;
  const spot = ix + (11 / 145) * iw;
  const spotR = xR - (11 / 145) * iw;

  const postHalf = ih * 0.045;
  const crossW = ih * 0.11;
  const postStroke = 0.42;

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="h-auto w-full max-h-[min(72vh,520px)]"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={props.caption}
    >
      <defs>
        <linearGradient id={props.grassId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#15382a" />
          <stop offset="50%" stopColor="#1b3d2f" />
          <stop offset="100%" stopColor="#1e4d38" />
        </linearGradient>
        <filter
          id={props.tokenShadowId}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feDropShadow
            dx="0"
            dy="0.6"
            stdDeviation="0.8"
            floodColor="rgb(0 0 0 / 0.35)"
          />
        </filter>
      </defs>
      <rect width={VB.w} height={VB.h} fill={`url(#${props.grassId})`} rx={4} />
      <rect
        x={ix}
        y={iy}
        width={iw}
        height={ih}
        fill="none"
        stroke="rgb(255 255 255 / 0.94)"
        strokeWidth={0.62}
      />

      <line
        x1={x13a}
        y1={iy}
        x2={x13a}
        y2={yB}
        stroke="rgb(255 255 255 / 0.45)"
        strokeWidth={0.32}
        strokeDasharray="4 3"
      />
      <line
        x1={x13b}
        y1={iy}
        x2={x13b}
        y2={yB}
        stroke="rgb(255 255 255 / 0.45)"
        strokeWidth={0.32}
        strokeDasharray="4 3"
      />
      {[x20a, x20b, x45a, x45b].map((x) => (
        <line
          key={x}
          x1={x}
          y1={iy}
          x2={x}
          y2={yB}
          stroke="rgb(255 255 255 / 0.9)"
          strokeWidth={x === x45a || x === x45b ? 0.52 : 0.46}
        />
      ))}
      <line
        x1={xMid}
        y1={iy}
        x2={xMid}
        y2={yB}
        stroke="rgb(255 255 255 / 0.96)"
        strokeWidth={0.58}
      />
      <circle
        cx={cx}
        cy={cy}
        r={rCentre}
        fill="none"
        stroke="rgb(255 255 255 / 0.88)"
        strokeWidth={0.48}
      />
      <circle cx={cx} cy={cy} r={0.5} fill="rgb(255 255 255 / 0.9)" />
      <circle cx={spot} cy={cy} r={0.38} fill="rgb(255 255 255 / 0.92)" />
      <circle cx={spotR} cy={cy} r={0.38} fill="rgb(255 255 255 / 0.92)" />

      <rect
        x={ix}
        y={yLargeT}
        width={largeD}
        height={largeW}
        fill="none"
        stroke="rgb(255 255 255 / 0.88)"
        strokeWidth={0.46}
      />
      <rect
        x={xR - largeD}
        y={yLargeT}
        width={largeD}
        height={largeW}
        fill="none"
        stroke="rgb(255 255 255 / 0.88)"
        strokeWidth={0.46}
      />
      <rect
        x={ix}
        y={ySmallT}
        width={smallD}
        height={smallW}
        fill="none"
        stroke="rgb(255 255 255 / 0.84)"
        strokeWidth={0.42}
      />
      <rect
        x={xR - smallD}
        y={ySmallT}
        width={smallD}
        height={smallW}
        fill="none"
        stroke="rgb(255 255 255 / 0.84)"
        strokeWidth={0.42}
      />

      {[
        { gx: ix, dir: 1 },
        { gx: xR, dir: -1 },
      ].map(({ gx, dir }) => (
        <g key={gx} transform={`translate(${gx},${cy})`}>
          <line
            x1={0}
            y1={-postHalf}
            x2={0}
            y2={postHalf}
            stroke="rgb(255 255 255 / 0.95)"
            strokeWidth={postStroke}
          />
          <line
            x1={0}
            y1={-crossW / 2}
            x2={dir * 2.2}
            y2={-crossW / 2}
            stroke="rgb(255 255 255 / 0.95)"
            strokeWidth={postStroke}
          />
          <line
            x1={0}
            y1={crossW / 2}
            x2={dir * 2.2}
            y2={crossW / 2}
            stroke="rgb(255 255 255 / 0.95)"
            strokeWidth={postStroke}
          />
          <line
            x1={dir * 2.2}
            y1={-crossW / 2}
            x2={dir * 2.2}
            y2={crossW / 2}
            stroke="rgb(255 255 255 / 0.95)"
            strokeWidth={postStroke}
          />
        </g>
      ))}

      <PlayerMarkers filterId={props.tokenShadowId} />
    </svg>
  );
}

export type SportsPitchDiagramsProps = {
  className?: string;
};

/**
 * Tabbed pitch diagrams: Soccer (IFAB-style) and GAA pair (Gaelic vs Hurling share one SVG — pixel-identical lines).
 */
export function SportsPitchDiagrams({ className }: SportsPitchDiagramsProps) {
  const [tab, setTab] = useState<SportTab>("soccer");
  const reactId = useId();
  const grassSoccer = useMemo(
    () => `demoGrassSoccer-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId],
  );
  const grassGaa = useMemo(
    () => `demoGrassGaa-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId],
  );
  const tokenShadowSoccer = useMemo(
    () => `demoTokSoc-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId],
  );
  const tokenShadowGaa = useMemo(
    () => `demoTokGaa-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId],
  );

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-700/90 dark:bg-slate-950 dark:ring-white/[0.06]",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Sports pitch diagrams
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Standard markings · shared formation · Gaelic &amp; Hurling fields are identical
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/90 p-1 dark:border-slate-700 dark:bg-slate-900/80"
          role="tablist"
          aria-label="Sport"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                tab === t.id
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/10 dark:bg-slate-800 dark:text-white dark:ring-white/10"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-slate-200/70 bg-slate-900/[0.03] dark:border-slate-700 dark:bg-black/20">
        <div className="aspect-[160/100] w-full">
          {tab === "soccer" ? (
            <SoccerPitchSvg
              grassId={grassSoccer}
              tokenShadowId={tokenShadowSoccer}
            />
          ) : (
            <GaaPitchSvg
              key="gaa-shared"
              grassId={grassGaa}
              tokenShadowId={tokenShadowGaa}
              caption={
                tab === "gaelic"
                  ? "Gaelic football pitch with GAA markings"
                  : "Hurling pitch with GAA markings"
              }
            />
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
        {tab === "hurling"
          ? "Hurling — same field lines as Gaelic football"
          : tab === "gaelic"
            ? "Gaelic football — 13 m / 20 m / 45 m lines & scoring ends"
            : "Soccer — penalty areas, arcs, six-yard boxes, halfway"}
      </p>
    </div>
  );
}
