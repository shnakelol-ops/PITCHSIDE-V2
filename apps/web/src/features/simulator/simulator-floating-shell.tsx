"use client";

import {
  SimulatorPixiSurface,
  type SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";

export type SimulatorFloatingShellProps = {
  initialSurfaceMode?: SimulatorSurfaceMode;
  linkedMatchId?: string | null;
};

export function SimulatorFloatingShell(
  props: SimulatorFloatingShellProps = {},
) {
  const surfaceMode = props.initialSurfaceMode ?? "SIMULATOR";

  return (
    <div className="simulator-direct relative h-[100dvh] min-h-0 overflow-hidden bg-[#0b0f0c]">
      <div className="absolute inset-0">
        <div className="h-[100vh] w-full">
          <SimulatorPixiSurface
            sport="gaelic"
            recordingMode={false}
            shadowRecordingMode={false}
            surfaceMode={surfaceMode}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
