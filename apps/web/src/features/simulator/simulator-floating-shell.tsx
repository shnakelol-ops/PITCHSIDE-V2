// <!-- redeploy trigger -->
"use client";

import type { SimulatorSurfaceMode } from "@src/features/simulator/pixi/simulator-pixi-surface";

export type SimulatorFloatingShellProps = {
  initialSurfaceMode?: SimulatorSurfaceMode;
  linkedMatchId?: string | null;
};

export function SimulatorFloatingShell({
  initialSurfaceMode: _initialSurfaceMode = "SIMULATOR",
  linkedMatchId: _linkedMatchId = null,
}: SimulatorFloatingShellProps = {}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-[#070b08] text-stone-200">
      <p className="px-6 text-center text-sm text-stone-300/90">
        Desktop simulator shell is currently placeholder-only in this reset.
      </p>
    </div>
  );
}
