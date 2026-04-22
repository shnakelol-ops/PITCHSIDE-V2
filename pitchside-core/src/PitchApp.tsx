import { useEffect, useRef } from "react";

import { Application, Container } from "pixi.js";

import { BOARD_PITCH_VIEWBOX } from "./constants/pitch-space";
import { createSimulatorPitchRoot } from "./features/simulator/pixi/create-pitch-root";

export function PitchApp() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let app: Application | null = null;
    let pitchDispose: (() => void) | null = null;

    const layout = (world: Container) => {
      if (!app || !host) return;
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      const scale = Math.min(w / BOARD_PITCH_VIEWBOX.w, h / BOARD_PITCH_VIEWBOX.h);
      const offsetX = (w - BOARD_PITCH_VIEWBOX.w * scale) * 0.5;
      const offsetY = (h - BOARD_PITCH_VIEWBOX.h * scale) * 0.5;
      app.renderer.resize(w, h);
      world.scale.set(scale);
      world.position.set(offsetX, offsetY);
    };

    void (async () => {
      const nextApp = new Application();
      await nextApp.init({
        width: Math.max(1, host.clientWidth),
        height: Math.max(1, host.clientHeight),
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, window.devicePixelRatio || 1),
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

      const world = new Container();
      nextApp.stage.addChild(world);

      const { root, dispose } = createSimulatorPitchRoot("gaelic");
      pitchDispose = dispose;
      world.addChild(root);

      layout(world);
      ro = new ResizeObserver(() => layout(world));
      ro.observe(host);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      pitchDispose?.();
      if (app) {
        try {
          host.removeChild(app.canvas as HTMLCanvasElement);
        } catch {
          /* canvas may already be detached */
        }
        app.destroy(true, { children: true, texture: true });
      }
    };
  }, []);

  return <div ref={hostRef} className="pitch-root" aria-label="Pixi pitch" role="img" />;
}
