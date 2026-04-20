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
    let pitchContainer: Container | null = null;
    let disposePitch: (() => void) | null = null;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const layout = () => {
      if (!app || !pitchContainer || !hostRef.current) return;
      const viewWidth = hostRef.current.clientWidth;
      const viewHeight = hostRef.current.clientHeight;
      if (viewWidth <= 0 || viewHeight <= 0) return;

      app.renderer.resolution = recommendedResolution();
      app.renderer.resize(viewWidth, viewHeight);

      const { scale, offsetX, offsetY } = fitWorldToView(viewWidth, viewHeight);
      pitchContainer.visible = true;
      pitchContainer.scale.set(Math.max(scale, 0.0001));
      pitchContainer.position.set(offsetX, offsetY);
      app.renderer.render(app.stage);
    };

    void (async () => {
      const pixi = await import("pixi.js");
      if (cancelled || !hostRef.current) return;

      const initWidth = Math.max(host.clientWidth, window.innerWidth, 1);
      const initHeight = Math.max(host.clientHeight, window.innerHeight, 1);
      app = new pixi.Application();
      await app.init({
        width: initWidth,
        height: initHeight,
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

      const canvas = (app.canvas ?? (app as Application & { view?: HTMLCanvasElement }).view) as HTMLCanvasElement;
      host.appendChild(canvas);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.touchAction = "none";

      pitchContainer = new pixi.Container();
      pitchContainer.sortableChildren = true;
      pitchContainer.visible = true;
      app.stage.removeChildren();
      app.stage.addChild(pitchContainer);

      const pitchMount = mountGaelicPitchRenderer("gaelic");
      disposePitch = pitchMount.dispose;
      pitchContainer.addChild(pitchMount.root);
      pitchMount.root.visible = true;
      pitchMount.root.scale.set(1, 1);

      const debugRect = new pixi.Graphics();
      debugRect
        .rect(
          BOARD_PITCH_VIEWBOX.w * 0.5 - 5,
          BOARD_PITCH_VIEWBOX.h * 0.5 - 5,
          10,
          10,
        )
        .fill(0xff0000);
      debugRect.label = "purePitchDebugRect";
      debugRect.zIndex = 9999;
      pitchContainer.addChild(debugRect);

      layout();
      resizeObserver = new ResizeObserver(layout);
      resizeObserver.observe(host);
      app.renderer.render(app.stage);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      pitchContainer?.removeChildren();
      pitchContainer = null;
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

  return (
    <div
      ref={hostRef}
      className="h-full w-full"
      style={{ width: "100%", height: "100vh" }}
      aria-label="Pure pitch surface"
    />
  );
}
