"use client";

import { useEffect, useRef } from "react";

import { Application, Container, Graphics } from "pixi.js";

import { getPitchConfig } from "@/config/pitchConfig";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";
import { createUnifiedPitchMarkingsGraphics } from "@src/features/simulator/renderer/unified-pitch-markings-graphics";
import { bakePremiumTurfTexture } from "@src/features/simulator/renderer/premium-turf-baker";
import {
  destroyPixiApplication,
  letterboxWorldToView,
  recommendedPixiResolution,
} from "@src/lib/pixiUtils";

function buildPitchRoot(): { root: Container; dispose: () => void } {
  const root = new Container();
  root.label = "mobileCleanPitchRoot";
  root.sortableChildren = true;

  const { w, h } = BOARD_PITCH_VIEWBOX;
  const { markings } = getPitchConfig("gaelic");

  const pitchBackground = new Graphics();
  pitchBackground.label = "mobileCleanPitchBackground";
  pitchBackground.rect(0, 0, w, h).fill({ color: 0x03110b });
  root.addChild(pitchBackground);

  const turfTexture = bakePremiumTurfTexture("gaelic");
  const turf = new Graphics();
  turf.label = "mobileCleanPitchTurf";
  turf.rect(0, 0, w, h).fill({ texture: turfTexture });
  root.addChild(turf);

  const markingsGraphics = createUnifiedPitchMarkingsGraphics(markings);
  markingsGraphics.label = "mobileCleanPitchMarkings";
  root.addChild(markingsGraphics);

  return {
    root,
    dispose: () => {
      turfTexture.destroy();
      root.destroy({ children: true });
    },
  };
}

export function MobileCleanPixiPitch() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let cancelled = false;
    let app: Application | null = null;
    let pitchDispose: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const resizeHandlers = new Set<() => void>();

    const layout = () => {
      const currentApp = appRef.current;
      const world = worldRef.current;
      if (!currentApp || !world) return;
      const viewW = host.clientWidth;
      const viewH = host.clientHeight;
      if (viewW <= 0 || viewH <= 0) return;

      currentApp.renderer.resolution = recommendedPixiResolution();
      currentApp.renderer.resize(viewW, viewH);

      const { w, h } = BOARD_PITCH_VIEWBOX;
      const { scale, offsetX, offsetY } = letterboxWorldToView(viewW, viewH, w, h);
      world.scale.set(scale);
      world.position.set(offsetX, offsetY);
    };

    resizeHandlers.add(layout);

    void (async () => {
      app = new Application();
      await app.init({
        canvas,
        width: host.clientWidth || 640,
        height: host.clientHeight || 400,
        backgroundColor: 0x000000,
        antialias: true,
        autoDensity: true,
        resolution: recommendedPixiResolution(),
        preference: "webgl",
        powerPreference: "high-performance",
      });

      if (cancelled) {
        destroyPixiApplication(app, { removeView: false });
        return;
      }

      appRef.current = app;

      const world = new Container();
      world.label = "mobileCleanPitchWorld";
      world.sortableChildren = true;
      worldRef.current = world;

      const { root, dispose } = buildPitchRoot();
      pitchDispose = dispose;
      world.addChild(root);

      app.stage.removeChildren();
      app.stage.addChild(world);
      layout();

      resizeObserver = new ResizeObserver(() => {
        resizeHandlers.forEach((handler) => handler());
      });
      resizeObserver.observe(host);
      window.addEventListener("resize", layout);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener("resize", layout);
      resizeHandlers.clear();

      pitchDispose?.();
      pitchDispose = null;

      worldRef.current?.destroy({ children: true });
      worldRef.current = null;

      const toDestroy = appRef.current ?? app;
      appRef.current = null;
      destroyPixiApplication(toDestroy, { removeView: false });
    };
  }, []);

  return (
    <div ref={hostRef} className="h-full w-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none select-none"
        style={{ touchAction: "none" }}
        aria-label="Matchday Mode pitch"
      />
    </div>
  );
}
