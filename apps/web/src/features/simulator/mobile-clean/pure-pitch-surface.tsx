"use client";

import { Application, Container, Graphics } from "pixi.js";

import { GaelicPitchRenderer } from "@src/features/simulator/renderer/GaelicPitchRenderer";

export function PurePitchSurface() {
  return (
    <div
      className="w-full"
      style={{ width: "100%", height: "100vh", background: "#000" }}
      ref={(node: HTMLDivElement | null) => {
        if (!node) return;
        if (node.dataset.pixiMounted === "true") return;
        node.dataset.pixiMounted = "true";

        void (async () => {
          const app = new Application();
          await app.init({
            width: Math.max(window.innerWidth, 1),
            height: Math.max(window.innerHeight, 1),
            backgroundAlpha: 0,
            autoDensity: true,
            resolution: Math.min(2, window.devicePixelRatio || 1),
          });

          node.appendChild(app.canvas as HTMLCanvasElement);

          const pitchContainer = new Container();
          app.stage.addChild(pitchContainer);

          const pitchRenderer = new GaelicPitchRenderer("gaelic");
          pitchContainer.addChild(pitchRenderer.root);

          const debugSquare = new Graphics();
          debugSquare.rect(0, 0, 20, 20).fill(0xff0000);
          debugSquare.position.set(10, 10);
          app.stage.addChild(debugSquare);
          app.renderer.render(app.stage);
        })();
      }}
      aria-label="Pixi minimal render test"
    />
  );
}
