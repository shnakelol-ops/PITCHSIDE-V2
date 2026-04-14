import { Graphics } from "pixi.js";

import { MICRO_ATHLETE_RADIUS_WORLD } from "@src/features/simulator/model/micro-athlete";
import type { ShadowPlaybackPose } from "@src/features/simulator/playback/shadow-playback-pose";
import { boardNormToWorld } from "@src/lib/pitch-coordinates";

/**
 * Semi-transparent “ghost” markers along shadow paths during playback only.
 */
export function drawShadowPlaybackGhosts(
  g: Graphics,
  poses: ReadonlyMap<string, ShadowPlaybackPose>,
): void {
  g.clear();
  const r = MICRO_ATHLETE_RADIUS_WORLD * 0.52;
  for (const p of poses.values()) {
    const { x, y } = boardNormToWorld(p.nx, p.ny);
    g.circle(x, y, r).fill({ color: 0x6366f1, alpha: 0.18 });
    g.circle(x, y, r).stroke({
      width: 0.2,
      color: "rgba(165, 180, 252, 0.48)",
      cap: "round",
      join: "round",
    });
  }
}
