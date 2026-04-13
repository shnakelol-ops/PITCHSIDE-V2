"use client";

import { useEffect, useRef, useState } from "react";

export type SimulatorMatchPhase =
  | "pre_match"
  | "first_half"
  | "halftime"
  | "second_half"
  | "full_time";

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function buildClockLabel(
  phase: SimulatorMatchPhase,
  firstHalfSec: number,
  secondHalfSec: number,
): string {
  switch (phase) {
    case "pre_match":
      return "00:00 · pre";
    case "first_half":
    case "halftime":
      return `1H ${formatMmSs(firstHalfSec)}`;
    case "second_half":
    case "full_time":
      return `2H ${formatMmSs(secondHalfSec)}`;
    default:
      return "00:00";
  }
}

/**
 * Simple match segment clock: ticks only while `active` and phase is first_half or second_half.
 */
export function useSimulatorMatchClock(active: boolean) {
  const [phase, setPhase] = useState<SimulatorMatchPhase>("pre_match");
  const [firstHalfSec, setFirstHalfSec] = useState(0);
  const [secondHalfSec, setSecondHalfSec] = useState(0);
  const clockLabelRef = useRef("00:00 · pre");

  useEffect(() => {
    clockLabelRef.current = buildClockLabel(phase, firstHalfSec, secondHalfSec);
  }, [phase, firstHalfSec, secondHalfSec]);

  useEffect(() => {
    if (!active) return;
    if (phase !== "first_half" && phase !== "second_half") return;
    const id = window.setInterval(() => {
      if (phase === "first_half") {
        setFirstHalfSec((t) => t + 1);
      } else {
        setSecondHalfSec((t) => t + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, phase]);

  return {
    phase,
    setPhase,
    firstHalfSec,
    secondHalfSec,
    clockLabelRef,
  };
}

export function formatSimulatorClockDisplay(
  phase: SimulatorMatchPhase,
  firstHalfSec: number,
  secondHalfSec: number,
): string {
  switch (phase) {
    case "pre_match":
      return "—";
    case "first_half":
    case "halftime":
      return `1H ${formatMmSs(firstHalfSec)}`;
    case "second_half":
    case "full_time":
      return `2H ${formatMmSs(secondHalfSec)}`;
    default:
      return "—";
  }
}
