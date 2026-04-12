"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage } from "react-konva";

import type { KonvaEventObject } from "konva/lib/Node";

import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";
import { getStatsEventMarkerStyle } from "@src/features/stats/board/stats-event-marker-style";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import {
  boardNormToWorld,
  letterboxPitchWorld,
  worldToBoardNorm,
  type BoardNorm,
} from "@src/lib/pitch-coordinates";

import type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";

const COMPACT_VIEWPORT_W = 480;

export type StatsPitchSurfaceProps = {
  className?: string;
  /** Fires on pointer down on the pitch (instant tap path). */
  onPitchTap?: (payload: StatsPitchTapPayload) => void;
  /** Logged stats events — rendered as typed dots (Phase 3+). */
  loggedEvents?: readonly StatsLoggedEvent[];
  /** Optional rehearsal markers (Phase 1); drawn after logged events. */
  tapMarkers?: readonly BoardNorm[];
  /** Phase 5: marker sizing/emphasis; pitch taps disabled when not `live`. */
  reviewMode?: StatsReviewMode;
};

/**
 * Konva pitch: letterboxed 160×100 world (same as simulator / board contract).
 * Pitch + lines on layer 0; markers on layer 1. Resize is rAF-batched; tap handler stays stable.
 */
export function StatsPitchSurface({
  className,
  onPitchTap,
  loggedEvents,
  tapMarkers = [],
  reviewMode = "live",
}: StatsPitchSurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 400 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let raf = 0;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.max(1, Math.floor(cr.width));
      const h = Math.max(1, Math.floor(cr.height));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({
      w: Math.max(1, Math.floor(r.width)),
      h: Math.max(1, Math.floor(r.height)),
    });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const { scale, offsetX, offsetY } = letterboxPitchWorld(
    size.w,
    size.h,
    BOARD_PITCH_VIEWBOX,
  );

  const worldGroupProps = {
    x: offsetX,
    y: offsetY,
    scaleX: scale,
    scaleY: scale,
  } as const;

  const density = size.w < COMPACT_VIEWPORT_W ? "compact" : "comfortable";

  const handlePitchPointerDown = useCallback((evt: KonvaEventObject<PointerEvent>) => {
    const stage = evt.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    const { w, h } = sizeRef.current;
    const lb = letterboxPitchWorld(w, h, BOARD_PITCH_VIEWBOX);
    const wx = (pos.x - lb.offsetX) / lb.scale;
    const wy = (pos.y - lb.offsetY) / lb.scale;
    const { nx, ny } = worldToBoardNorm(wx, wy);
    onPitchTap?.({
      nx,
      ny,
      atMs: Date.now(),
      stageX: pos.x,
      stageY: pos.y,
    });
  }, [onPitchTap]);

  const events = loggedEvents ?? [];
  const pitchInteractive = reviewMode === "live" && Boolean(onPitchTap);

  const markerOpts = useMemo(
    () => ({ reviewMode, density }) as const,
    [reviewMode, density],
  );

  const eventCircles = useMemo(
    () =>
      events.map((e) => {
        const p = boardNormToWorld(e.nx, e.ny);
        const st = getStatsEventMarkerStyle(e, markerOpts);
        return { id: e.id, p, st };
      }),
    [events, markerOpts],
  );

  const rehearsalCircles = useMemo(
    () =>
      tapMarkers.map((m, i) => ({
        i,
        p: boardNormToWorld(m.nx, m.ny),
        r: density === "compact" ? 1.95 : 2.2,
      })),
    [tapMarkers, density],
  );

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        touchAction: "none",
        width: "100%",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Stage width={size.w} height={size.h} listening={pitchInteractive}>
        <Layer
          name="stats-pitch-base"
          perfectDrawEnabled={false}
          listening={pitchInteractive}
        >
          <Group {...worldGroupProps} listening={pitchInteractive}>
            <Rect
              name="stats-pitch-hit"
              x={0}
              y={0}
              width={BOARD_PITCH_VIEWBOX.w}
              height={BOARD_PITCH_VIEWBOX.h}
              cornerRadius={2.5}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: BOARD_PITCH_VIEWBOX.h }}
              fillLinearGradientColorStops={[
                0,
                "rgb(6 78 59)",
                0.45,
                "rgb(5 95 70)",
                1,
                "rgb(2 44 34)",
              ]}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={0.35}
              shadowBlur={18}
              shadowColor="rgba(0,0,0,0.45)"
              shadowOffsetY={6}
              listening={pitchInteractive}
              onPointerDown={pitchInteractive ? handlePitchPointerDown : undefined}
            />
            <Line
              points={[
                0,
                BOARD_PITCH_VIEWBOX.h / 2,
                BOARD_PITCH_VIEWBOX.w,
                BOARD_PITCH_VIEWBOX.h / 2,
              ]}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={0.25}
              listening={false}
            />
          </Group>
        </Layer>
        <Layer name="stats-pitch-markers" listening={false} perfectDrawEnabled={false}>
          <Group {...worldGroupProps} listening={false}>
            {eventCircles.map(({ id, p, st }) => (
              <Circle
                key={id}
                x={p.x}
                y={p.y}
                radius={st.radius}
                fill={st.fill}
                stroke={st.stroke}
                strokeWidth={st.strokeWidth}
                shadowBlur={st.shadowBlur}
                shadowColor={st.shadowColor}
                listening={false}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
            ))}
            {rehearsalCircles.map(({ i, p, r }) => (
              <Circle
                key={`tap-marker-${i}`}
                x={p.x}
                y={p.y}
                radius={r}
                fill="rgba(250, 250, 250, 0.92)"
                stroke="rgba(16, 185, 153, 0.55)"
                strokeWidth={0.4}
                listening={false}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
