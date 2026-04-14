import type { Ticker } from "pixi.js";

import {
  shortestAngleDelta,
  smoothAngleToward,
} from "@src/features/simulator/math/shortest-angle-lerp";
import type { MovementPathStore } from "@src/features/simulator/path/movement-path-store";
import type { ShadowPlaybackPose } from "@src/features/simulator/playback/shadow-playback-pose";
import {
  durationMsForPath,
  sampleMovementPathAtProgress,
  type PathSamplePoint,
} from "@src/features/simulator/playback/path-playback-math";

const POS_EPS = 2.5e-7;
const HEADING_EPS = 4e-5;
/** Radians per second — higher follows path tangent more tightly while easing corners. */
const HEADING_SMOOTHING_PER_S = 13.5;

export type SimulatorPlaybackControllerOptions = {
  ticker: Ticker;
  pathStore: MovementPathStore;
  applyPose: (
    microAthleteId: string,
    nx: number,
    ny: number,
    headingRad: number,
  ) => void;
  /** Full sync when omitted; during playback pass only athletes that moved (GPU/CPU). */
  flushVisuals: (dirtyAthleteIds?: ReadonlySet<string>) => void;
  setPlaybackDriving: (driving: boolean) => void;
  /** Clears or updates ghost markers for shadow-run playback (read-only path data). */
  updateShadowGhosts: (poses: ReadonlyMap<string, ShadowPlaybackPose>) => void;
};

/**
 * Time-based playback: one global clock (`elapsedMs`), per-path duration from arc length.
 * Snapshots main + shadow polylines on play (copies only; store is never written here).
 */
export class SimulatorPlaybackController {
  private readonly opts: SimulatorPlaybackControllerOptions;
  private readonly unsubPathStore: () => void;
  private playing = false;
  private finished = false;
  private elapsedMs = 0;
  private mainSnapshot = new Map<string, ReadonlyArray<PathSamplePoint>>();
  private shadowSnapshot = new Map<string, ReadonlyArray<PathSamplePoint>>();
  private readonly smoothedMainHeading = new Map<string, number>();
  private readonly lastRenderedPose = new Map<
    string,
    { nx: number; ny: number; headingRad: number }
  >();
  private readonly tickBind = (ticker: Ticker) => this.tick(ticker);

  constructor(opts: SimulatorPlaybackControllerOptions) {
    this.opts = opts;
    this.unsubPathStore = opts.pathStore.subscribe(() => {
      if (!this.playing) {
        this.mainSnapshot.clear();
        this.shadowSnapshot.clear();
        this.smoothedMainHeading.clear();
        this.lastRenderedPose.clear();
      }
    });
  }

  play(): void {
    if (this.playing) return;
    if (this.finished || this.isSnapshotEmpty()) {
      this.captureSnapshot();
      this.elapsedMs = 0;
      this.finished = false;
    }
    if (this.isSnapshotEmpty()) return;
    this.playing = true;
    this.opts.setPlaybackDriving(true);
    this.opts.ticker.add(this.tickBind);
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.opts.ticker.remove(this.tickBind);
    this.opts.setPlaybackDriving(false);
  }

  /** Stop, rewind time, snap athletes to main path starts; shadow ghosts cleared. */
  reset(): void {
    this.pause();
    this.mainSnapshot.clear();
    this.shadowSnapshot.clear();
    this.smoothedMainHeading.clear();
    this.lastRenderedPose.clear();
    this.elapsedMs = 0;
    this.finished = false;
    for (const path of this.opts.pathStore.getAllPaths()) {
      if (path.points.length < 2) continue;
      const pose = sampleMovementPathAtProgress(path.points, 0);
      if (pose) {
        this.opts.applyPose(path.microAthleteId, pose.nx, pose.ny, pose.headingRad);
      }
    }
    this.opts.updateShadowGhosts(new Map());
    this.opts.flushVisuals();
  }

  destroy(): void {
    this.pause();
    this.unsubPathStore();
    this.mainSnapshot.clear();
    this.shadowSnapshot.clear();
    this.smoothedMainHeading.clear();
    this.lastRenderedPose.clear();
    this.opts.updateShadowGhosts(new Map());
  }

  private isSnapshotEmpty(): boolean {
    return this.mainSnapshot.size === 0 && this.shadowSnapshot.size === 0;
  }

  private captureSnapshot(): void {
    this.mainSnapshot.clear();
    for (const path of this.opts.pathStore.getAllPaths()) {
      if (path.points.length < 2) continue;
      const copy = path.points.map((p) => ({ nx: p.nx, ny: p.ny }));
      this.mainSnapshot.set(path.microAthleteId, copy);
    }
    this.shadowSnapshot.clear();
    for (const run of this.opts.pathStore.getAllShadowRuns()) {
      if (run.points.length < 2) continue;
      const copy = run.points.map((p) => ({ nx: p.nx, ny: p.ny }));
      this.shadowSnapshot.set(run.microAthleteId, copy);
    }
    this.smoothedMainHeading.clear();
    this.lastRenderedPose.clear();
  }

  private tick(ticker: Ticker): void {
    if (!this.playing) return;
    const deltaMS = ticker.deltaMS;
    this.elapsedMs += deltaMS;
    let allDone = true;

    for (const [id, pts] of this.mainSnapshot) {
      const dur = durationMsForPath(pts);
      const t = Math.min(1, dur > 0 ? this.elapsedMs / dur : 1);
      if (t < 1 - 1e-6) allDone = false;
      const pose = sampleMovementPathAtProgress(pts, t);
      if (!pose) continue;

      const targetH = pose.headingRad;
      const prevSmooth = this.smoothedMainHeading.get(id);
      const headingRad = smoothAngleToward(
        prevSmooth,
        targetH,
        deltaMS,
        HEADING_SMOOTHING_PER_S,
      );
      this.smoothedMainHeading.set(id, headingRad);

      const prev = this.lastRenderedPose.get(id);
      const moved =
        prev == null ||
        Math.abs(prev.nx - pose.nx) > POS_EPS ||
        Math.abs(prev.ny - pose.ny) > POS_EPS ||
        Math.abs(shortestAngleDelta(prev.headingRad, headingRad)) > HEADING_EPS;

      if (moved) {
        this.opts.applyPose(id, pose.nx, pose.ny, headingRad);
        this.lastRenderedPose.set(id, {
          nx: pose.nx,
          ny: pose.ny,
          headingRad,
        });
      }
    }

    const ghostPoses = new Map<string, ShadowPlaybackPose>();
    for (const [id, pts] of this.shadowSnapshot) {
      const dur = durationMsForPath(pts);
      const tProgress = Math.min(1, dur > 0 ? this.elapsedMs / dur : 1);
      if (tProgress < 1 - 1e-6) allDone = false;
      const pose = sampleMovementPathAtProgress(pts, tProgress);
      if (pose) {
        ghostPoses.set(id, {
          nx: pose.nx,
          ny: pose.ny,
          headingRad: pose.headingRad,
        });
      }
    }
    this.opts.updateShadowGhosts(ghostPoses);

    // Full visual sync every frame: partial sync skips athletes whose pose did not
    // change but still have selection/scale easing (micro-athlete views).
    this.opts.flushVisuals();
    if (allDone && !this.isSnapshotEmpty()) {
      this.finished = true;
      this.pause();
    }
  }
}
