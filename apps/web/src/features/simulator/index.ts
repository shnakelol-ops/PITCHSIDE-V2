/** @public Simulator engine (ARCHITECTURE.md §2, §8). */

export {
  SimulatorBoardShell,
  type SimulatorBoardShellProps,
} from "@src/features/simulator/simulator-board-shell";
export { SimulatorPixiSurface } from "@src/features/simulator/pixi/simulator-pixi-surface";
export type {
  SimulatorPixiSurfaceHandle,
  SimulatorPixiSurfaceProps,
  SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
export { createSimulatorPitchRoot } from "@src/features/simulator/pixi/create-pitch-root";
export type { SimulatorPitchMount } from "@src/features/simulator/pixi/create-pitch-root";
export {
  GaelicPitchRenderer,
  mountGaelicPitchRenderer,
} from "@src/features/simulator/renderer/GaelicPitchRenderer";
export type { GaelicPitchMount } from "@src/features/simulator/renderer/GaelicPitchRenderer";
export {
  PremiumPitchRenderer,
  createPremiumPitchRoot,
  mountPremiumPitchRenderer,
} from "@src/features/simulator/renderer/PremiumPitchRenderer";
export type { PremiumPitchMount } from "@src/features/simulator/renderer/PremiumPitchRenderer";
export type { MicroAthlete, MicroAthleteTeam } from "@src/features/simulator/model/micro-athlete";
export {
  createDefaultMicroAthletes,
  MICRO_ATHLETE_HIT_RADIUS_WORLD,
  MICRO_ATHLETE_RADIUS_WORLD,
} from "@src/features/simulator/model/micro-athlete";
export type {
  MovementPath,
  MovementPathPoint,
} from "@src/features/simulator/model/movement-path";
export { createMovementPath } from "@src/features/simulator/model/movement-path";
export type { ShadowRun, ShadowRunPoint } from "@src/features/simulator/model/shadow-run";
export { createShadowRun } from "@src/features/simulator/model/shadow-run";
export { MovementPathStore } from "@src/features/simulator/path/movement-path-store";
export { drawMovementPathsGraphics } from "@src/features/simulator/pixi/movement-path-graphics";
export { drawShadowRunsGraphics } from "@src/features/simulator/pixi/shadow-path-graphics";
