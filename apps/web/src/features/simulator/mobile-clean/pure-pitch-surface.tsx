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
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundAlpha: 0,
            autoDensity: true,
            resolution: Math.min(2, window.devicePixelRatio || 1),
          });

          node.appendChild(app.canvas as HTMLCanvasElement);

          const pitchContainer = new Container();
          app.stage.addChild(pitchContainer);

          const pitchRenderer = new GaelicPitchRenderer("gaelic");
          pitchContainer.addChild(pitchRenderer.root);

          const layoutPitch = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            app.renderer.resize(screenWidth, screenHeight);

            const bounds = pitchContainer.getLocalBounds();
            const safeWidth = Math.max(bounds.width, 1);
            const safeHeight = Math.max(bounds.height, 1);
            const scale = Math.min(screenWidth / safeWidth, screenHeight / safeHeight);

            const scaledWidth = safeWidth * scale;
            const scaledHeight = safeHeight * scale;
            pitchContainer.scale.set(scale, scale);
            pitchContainer.x = (screenWidth - scaledWidth) / 2 - bounds.x * scale;
            pitchContainer.y = (screenHeight - scaledHeight) / 2 - bounds.y * scale;
            app.renderer.render(app.stage);
          };

          window.addEventListener("resize", layoutPitch);

          const debugSquare = new Graphics();
          debugSquare.rect(0, 0, 20, 20).fill(0xff0000);
          debugSquare.position.set(10, 10);
          app.stage.addChild(debugSquare);
          layoutPitch();
        })();
      }}
      aria-label="Pixi minimal render test"
    />
  );
}
