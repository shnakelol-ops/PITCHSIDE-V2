/**
 * Minimal foundation demo for PitchCanvas — validates layers + ticker only (not product art).
 */
import type { Application, Container } from "pixi.js";
import { Graphics } from "pixi.js";

import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";

export type PitchCanvasDemoScene = {
  dispose: () => void;
};

export function installPitchCanvasDemoScene(
  app: Application,
  layers: {
    background: Container;
    dynamic: Container;
    overlay: Container;
  },
): PitchCanvasDemoScene {
  const { w: vbW, h: vbH } = BOARD_PITCH_VIEWBOX;

  const field = new Graphics();
  field.rect(0, 0, vbW, vbH).fill({ color: 0x14532d });
  field.rect(0, 0, vbW, vbH).stroke({
    width: 0.35,
    color: "rgba(255,255,255,0.35)",
  });
  field.moveTo(vbW * 0.5, 0).lineTo(vbW * 0.5, vbH).stroke({
    width: 0.22,
    color: "rgba(255,255,255,0.55)",
  });
  field.circle(vbW * 0.5, vbH * 0.5, vbH * 0.18).stroke({
    width: 0.2,
    color: "rgba(255,255,255,0.5)",
  });
  layers.background.addChild(field);

  const ball = new Graphics();
  ball.circle(0, 0, 1.1).fill({ color: 0xfffef5 });
  ball.circle(0, 0, 1.1).stroke({ width: 0.12, color: 0x333333 });
  ball.position.set(vbW * 0.52, vbH * 0.5);
  layers.dynamic.addChild(ball);

  const n = 6;
  const players: Graphics[] = [];
  const baseY: number[] = [];
  for (let i = 0; i < n; i++) {
    const g = new Graphics();
    const hue = i % 2 === 0 ? 0x1d4ed8 : 0xdc2626;
    g.circle(0, 0, 1.85).fill({ color: hue });
    g.circle(0, 0, 1.85).stroke({ width: 0.14, color: 0xffffff });
    const ax = vbW * 0.22 + ((i * 0.9) % (vbW * 0.55));
    const ay = vbH * 0.22 + (i % 3) * 5.5;
    baseY.push(ay);
    g.position.set(ax, ay);
    const arrow = new Graphics();
    arrow.moveTo(1.1, 0).lineTo(2.5, 0.55).lineTo(2.5, -0.55).closePath();
    arrow.fill({ color: 0xfbbf24 });
    g.addChild(arrow);
    layers.dynamic.addChild(g);
    players.push(g);
  }

  const overlayNote = new Graphics();
  overlayNote
    .roundRect(vbW * 0.62, vbH * 0.06, vbW * 0.34, 4.2, 0.35)
    .fill({ color: 0x0f172a, alpha: 0.55 });
  overlayNote
    .roundRect(vbW * 0.62, vbH * 0.06, vbW * 0.34, 4.2, 0.35)
    .stroke({ width: 0.08, color: "rgba(255,255,255,0.2)" });
  layers.overlay.addChild(overlayNote);

  const t0 = performance.now();
  const tick = (): void => {
    const t = (performance.now() - t0) * 0.001;
    ball.position.x = vbW * 0.52 + Math.sin(t * 1.2) * 1.8;
    ball.position.y = vbH * 0.5 + Math.cos(t * 0.9) * 0.9;
    players.forEach((p, i) => {
      p.position.y = baseY[i]! + Math.sin(t * 2.1 + i * 0.4) * 0.18;
    });
  };
  app.ticker.add(tick);

  return {
    dispose: () => {
      app.ticker.remove(tick);
      layers.background.removeChild(field);
      field.destroy({ children: true });
      layers.dynamic.removeChild(ball);
      ball.destroy({ children: true });
      for (const p of players) {
        layers.dynamic.removeChild(p);
        p.destroy({ children: true });
      }
      layers.overlay.removeChild(overlayNote);
      overlayNote.destroy({ children: true });
    },
  };
}
