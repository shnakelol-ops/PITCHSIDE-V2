"use client";

import type { CSSProperties } from "react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { Application, Container } from "pixi.js";

import {
  installPitchCanvasDemoScene,
  type PitchCanvasDemoScene,
} from "@src/components/pitch-canvas/pitch-canvas-demo-scene";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";
import {
  destroyPixiApplication,
  letterboxWorldToView,
  recommendedPixiResolution,
  warnIfMultipleCanvases,
} from "@src/lib/pixiUtils";
import { cn } from "@pitchside/utils";

export type PitchCanvasLayers = {
  background: Container;
  dynamic: Container;
  overlay: Container;
};

export type PitchCanvasHandle = {
  /** Single Pixi Application bound to the controlled canvas. */
  getApplication: () => Application | null;
  /** World root (letterboxed); children are the three layers. */
  getWorld: () => Container | null;
  getLayers: () => PitchCanvasLayers | null;
  getViewSize: () => { width: number; height: number };
  /** Recompute letterbox + renderer resize from the host element. */
  layout: () => void;
};

export type PitchCanvasProps = {
  className?: string;
  /** Fixed CSS width (px). Omit with `height` to derive from `aspectRatio`. */
  width?: number;
  /** Fixed CSS height (px). */
  height?: number;
  /**
   * Viewport aspect ratio `width / height` when using fluid sizing (e.g. `w-full`).
   * @default BOARD_PITCH_VIEWBOX aspect (160:100).
   */
  aspectRatio?: number;
  /**
   * When true, installs a tiny demo scene (field + players + ball + motion) for foundation validation.
   * Production boards should pass `false`.
   */
  foundationDemo?: boolean;
};

const DEFAULT_ASPECT =
  BOARD_PITCH_VIEWBOX.w / Math.max(1, BOARD_PITCH_VIEWBOX.h);

/**
 * One React-owned `<canvas>` → one `Application.init({ canvas })` lifecycle.
 * Layer roots: background (static pitch), dynamic (players / paths), overlay (annotations).
 */
export const PitchCanvas = forwardRef<PitchCanvasHandle, PitchCanvasProps>(
  function PitchCanvas(
    {
      className,
      width,
      height,
      aspectRatio = DEFAULT_ASPECT,
      foundationDemo = false,
    },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<Application | null>(null);
    const worldRef = useRef<Container | null>(null);
    const layersRef = useRef<PitchCanvasLayers | null>(null);
    const demoDisposeRef = useRef<PitchCanvasDemoScene | null>(null);
    const viewSizeRef = useRef({ width: 0, height: 0 });
    const resizeObsRef = useRef<ResizeObserver | null>(null);

    const layout = () => {
      const app = appRef.current;
      const world = worldRef.current;
      const host = hostRef.current;
      if (!app || !world || !host) return;
      const cw = host.clientWidth;
      const ch = host.clientHeight;
      if (cw <= 0 || ch <= 0) return;
      const dpr = recommendedPixiResolution();
      app.renderer.resolution = dpr;
      app.renderer.resize(cw, ch);
      viewSizeRef.current = { width: cw, height: ch };
      const { w: vbW, h: vbH } = BOARD_PITCH_VIEWBOX;
      const { scale, offsetX, offsetY } = letterboxWorldToView(cw, ch, vbW, vbH);
      world.scale.set(scale);
      world.position.set(offsetX, offsetY);
    };

    useImperativeHandle(ref, () => ({
      getApplication: () => appRef.current,
      getWorld: () => worldRef.current,
      getLayers: () => layersRef.current,
      getViewSize: () => ({ ...viewSizeRef.current }),
      layout,
    }));

    useEffect(() => {
      const host = hostRef.current;
      const canvas = canvasRef.current;
      if (!host || !canvas) return;

      let cancelled = false;
      let app: Application | null = null;

      void (async () => {
        if (cancelled || !canvasRef.current || !hostRef.current) return;

        app = new Application();
        await app.init({
          canvas,
          width: host.clientWidth || 640,
          height: host.clientHeight || 400,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: recommendedPixiResolution(),
          preference: "webgl",
          powerPreference: "high-performance",
        });

        if (cancelled) {
          destroyPixiApplication(app);
          return;
        }

        appRef.current = app;
        warnIfMultipleCanvases(host, "PitchCanvas");

        const world = new Container();
        world.sortableChildren = true;
        worldRef.current = world;

        const background = new Container();
        background.label = "pitchBackground";
        const dynamic = new Container();
        dynamic.label = "pitchDynamic";
        const overlay = new Container();
        overlay.label = "pitchOverlay";
        world.addChild(background);
        world.addChild(dynamic);
        world.addChild(overlay);
        layersRef.current = { background, dynamic, overlay };

        app.stage.removeChildren();
        app.stage.addChild(world);

        if (foundationDemo) {
          demoDisposeRef.current?.dispose();
          demoDisposeRef.current = installPitchCanvasDemoScene(app, {
            background,
            dynamic,
            overlay,
          });
        }

        layout();

        const ro = new ResizeObserver(() => layout());
        ro.observe(host);
        resizeObsRef.current = ro;
      })();

      return () => {
        cancelled = true;
        resizeObsRef.current?.disconnect();
        resizeObsRef.current = null;
        demoDisposeRef.current?.dispose();
        demoDisposeRef.current = null;
        layersRef.current = null;
        worldRef.current = null;
        const toDestroy = appRef.current ?? app;
        appRef.current = null;
        destroyPixiApplication(toDestroy, { removeView: false });
      };
    }, [foundationDemo]);

    const fixedSize = width != null && height != null;
    const wrapperStyle: CSSProperties = fixedSize
      ? { width, height }
      : { width: width ?? "100%", aspectRatio: String(aspectRatio) };

    return (
      <div
        ref={hostRef}
        className={cn("relative isolate overflow-hidden bg-slate-950", className)}
        style={wrapperStyle}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full touch-none select-none"
          style={{ touchAction: "none" }}
          aria-label="Tactical pitch canvas"
        />
      </div>
    );
  },
);

PitchCanvas.displayName = "PitchCanvas";
