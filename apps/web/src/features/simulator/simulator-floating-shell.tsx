// <!-- redeploy trigger -->
"use client";

import { MobileSimulatorScene } from "@src/features/simulator/mobile-simulator-scene";
import type { SimulatorSurfaceMode } from "@src/features/simulator/pixi/simulator-pixi-surface";

export type SimulatorFloatingShellProps = {
  initialSurfaceMode?: SimulatorSurfaceMode;
  linkedMatchId?: string | null;
};

export function SimulatorFloatingShell({
  initialSurfaceMode = "SIMULATOR",
  linkedMatchId = null,
}: SimulatorFloatingShellProps = {}) {
  return (
    <MobileSimulatorScene
      initialSurfaceMode={initialSurfaceMode}
      linkedMatchId={linkedMatchId}
    />
  );
}
