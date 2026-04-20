"use client";

import { useEffect, useRef } from "react";

import type { Application, Container } from "pixi.js";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";
import { mountGaelicPitchRenderer } from "@src/features/simulator/renderer/GaelicPitchRenderer";

function recommendedResolution(): number {
  return Math.min(2, window.devicePixelRatio || 1);
}

function fitWorldToView(viewWidth: number, viewHeight: number) {
  if (viewWidth <= 0 || viewHeight <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const { w: worldWidth, h: worldHeight } = BOARD_PITCH_VIEWBOX;
  const scale = Math.min(viewWidth / worldWidth, viewHeight / worldHeight);
  const offsetX = (viewWidth - worldWidth * scale) * 0.5;
  const offsetY = (viewHeight - worldHeight * scale) * 0.5;
  return { scale, offsetX, offsetY };
}

export function PurePitchSurface() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let app: Application | null = null;
    let world: Container | null = null;
    let disposePitch: (() => void) | null = null;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const layout = () => {
      if (!app || !world || !hostRef.current) return;
      const viewWidth = hostRef.current.clientWidth;
      const viewHeight = hostRef.current.clientHeight;
      if (viewWidth <= 0 || viewHeight <= 0) return;

      app.renderer.resolution = recommendedResolution();
      app.renderer.resize(viewWidth, viewHeight);

      const { scale, offsetX, offsetY } = fitWorldToView(viewWidth, viewHeight);
      world.scale.set(scale);
      world.position.set(offsetX, offsetY);
    };

    void (async () => {
      const pixi = await import("pixi.js");
      if (cancelled || !hostRef.current) return;

      app = new pixi.Application();
      await app.init({
        width: host.clientWidth || 800,
        height: host.clientHeight || 500,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: recommendedResolution(),
        preference: "webgl",
        powerPreference: "high-performance",
      });

      if (cancelled) {
        app.destroy(
          { removeView: true },
          { children: true, texture: true, textureSource: true, context: true },
        );
        app = null;
        return;
      }

      const canvas = app.canvas as HTMLCanvasElement;
      host.appendChild(canvas);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.touchAction = "none";

      world = new pixi.Container();
      world.sortableChildren = true;
      app.stage.removeChildren();
      app.stage.addChild(world);

      const pitchMount = mountGaelicPitchRenderer(
        "gaelic",
      );
      disposePitch = pitchMount.dispose;
      world.addChild(pitchMount.root);

      layout();
      resizeObserver = new ResizeObserver(layout);
      resizeObserver.observe(host);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      world?.removeChildren();
      world = null;
      disposePitch?.();
      disposePitch = null;
      if (app) {
        app.destroy(
          { removeView: true },
          { children: true, texture: true, textureSource: true, context: true },
        );
        app = null;
      }
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full" aria-label="Pure pitch surface" />;
}
