"use client";

import type { SimulatorBoardShellProps } from "@src/features/simulator/simulator-board-shell";
import { SimulatorBoardShell } from "@src/features/simulator/simulator-board-shell";

export type SimulatorFloatingShellProps = SimulatorBoardShellProps;

export function SimulatorFloatingShell(props: SimulatorFloatingShellProps = {}) {
  return <SimulatorBoardShell {...props} />;
}
