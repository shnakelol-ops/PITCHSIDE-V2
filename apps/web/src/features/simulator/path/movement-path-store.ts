import {
  createMovementPath,
  type MovementPath,
} from "@src/features/simulator/model/movement-path";
import {
  createShadowRun,
  type ShadowRun,
} from "@src/features/simulator/model/shadow-run";
import { clamp01 } from "@src/lib/pitch-coordinates";

const MIN_POINT_DIST_NORM = 0.0025;

/**
 * In-memory path data only — no Pixi. Main paths + shadow runs emit on change.
 */
export class MovementPathStore {
  private readonly paths = new Map<string, MovementPath>();
  /** At most one shadow run per micro-athlete (teaching overlay). */
  private readonly shadowRuns = new Map<string, ShadowRun>();
  private readonly listeners = new Set<() => void>();

  /** Replace any existing main path for this athlete with a new empty path. */
  startPath(microAthleteId: string): void {
    const next = createMovementPath(microAthleteId);
    this.paths.set(microAthleteId, next);
    const shadow = this.shadowRuns.get(microAthleteId);
    if (shadow) {
      shadow.mainPathId = next.id;
    }
    this.emit();
  }

  /** Append if far enough from last point; no-op if no path exists for id. */
  appendPoint(microAthleteId: string, nx: number, ny: number): void {
    const path = this.paths.get(microAthleteId);
    if (!path) return;
    const px = clamp01(nx);
    const py = clamp01(ny);
    const last = path.points[path.points.length - 1];
    if (
      last != null &&
      (last.nx - px) * (last.nx - px) + (last.ny - py) * (last.ny - py) <
        MIN_POINT_DIST_NORM * MIN_POINT_DIST_NORM
    ) {
      return;
    }
    path.points.push({ nx: px, ny: py });
    this.emit();
  }

  /**
   * Start (or replace) the shadow run for this athlete. Links `mainPathId` to the
   * current main path when one exists.
   */
  startShadowPath(microAthleteId: string): void {
    const main = this.paths.get(microAthleteId);
    const mainPathId = main?.id ?? null;
    this.shadowRuns.set(
      microAthleteId,
      createShadowRun(microAthleteId, mainPathId),
    );
    this.emit();
  }

  appendShadowPoint(microAthleteId: string, nx: number, ny: number): void {
    const run = this.shadowRuns.get(microAthleteId);
    if (!run) return;
    const px = clamp01(nx);
    const py = clamp01(ny);
    const last = run.points[run.points.length - 1];
    if (
      last != null &&
      (last.nx - px) * (last.nx - px) + (last.ny - py) * (last.ny - py) <
        MIN_POINT_DIST_NORM * MIN_POINT_DIST_NORM
    ) {
      return;
    }
    run.points.push({ nx: px, ny: py });
    this.emit();
  }

  getPath(microAthleteId: string): MovementPath | undefined {
    return this.paths.get(microAthleteId);
  }

  getAllPaths(): MovementPath[] {
    return [...this.paths.values()];
  }

  getShadowRun(microAthleteId: string): ShadowRun | undefined {
    return this.shadowRuns.get(microAthleteId);
  }

  getAllShadowRuns(): ShadowRun[] {
    return [...this.shadowRuns.values()];
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
