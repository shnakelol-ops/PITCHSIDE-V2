"use client";

import { useEffect, useRef } from "react";

import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";
import { createSimulatorPitchRoot } from "@src/features/simulator/pixi/create-pitch-root";
import { letterboxPitchWorld } from "@src/lib/pitch-coordinates";
import { recommendedPixiResolution } from "@src/lib/pixiUtils";

type PixiApp = import("pixi.js").Application;
type PixiContainer = import("pixi.js").Container;

export function SimulatorMobileCleanPixi() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let app: PixiApp | null = null;
    let world: PixiContainer | null = null;
    let disposePitch: (() => void) | null = null;
    let ro: ResizeObserver | null = null;

    const layout = () => {
      if (!app || !world || !host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w <= 0 || h <= 0) return;
      app.renderer.resolution = recommendedPixiResolution();
      app.renderer.resize(w, h);
      const { scale, offsetX, offsetY } = letterboxPitchWorld(
        w,
        h,
        BOARD_PITCH_VIEWBOX,
      );
      world.scale.set(scale);
      world.position.set(offsetX, offsetY);
    };

    void (async () => {
      const { Application, Container } = await import("pixi.js");
      if (cancelled || !hostRef.current) return;

      const nextApp = new Application();
      await nextApp.init({
        width: host.clientWidth || 640,
        height: host.clientHeight || 360,
        backgroundColor: 0x040607,
        backgroundAlpha: 1,
        antialias: true,
        autoDensity: true,
        resolution: recommendedPixiResolution(),
      });
      if (cancelled) {
        nextApp.destroy(true);
        return;
      }

      app = nextApp;
      host.appendChild(nextApp.canvas as HTMLCanvasElement);
      nextApp.canvas.style.width = "100%";
      nextApp.canvas.style.height = "100%";
      nextApp.canvas.style.display = "block";

      const nextWorld = new Container();
      world = nextWorld;
      nextApp.stage.addChild(nextWorld);

      const { root, dispose } = createSimulatorPitchRoot("gaelic");
      disposePitch = dispose;
      nextWorld.addChild(root);

      layout();
      ro = new ResizeObserver(layout);
      ro.observe(host);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      ro = null;
      disposePitch?.();
      disposePitch = null;
      if (app && host.contains(app.canvas as Node)) {
        host.removeChild(app.canvas as HTMLCanvasElement);
      }
      app?.destroy(true, { children: true, texture: true, textureSource: true });
      app = null;
      world = null;
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full" aria-label="Matchday pitch" />;
}
