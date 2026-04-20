"use client";

import { Application, Graphics } from "pixi.js";

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

          const rectangle = new Graphics();
          const rectWidth = 220;
          const rectHeight = 140;
          rectangle.rect(-rectWidth / 2, -rectHeight / 2, rectWidth, rectHeight).fill(0xff0000);
          rectangle.position.set(app.screen.width / 2, app.screen.height / 2);
          app.stage.addChild(rectangle);
        })();
      }}
      aria-label="Pixi minimal render test"
    />
  );
}
