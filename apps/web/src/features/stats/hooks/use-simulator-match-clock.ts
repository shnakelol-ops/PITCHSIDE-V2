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
  const [running, setRunning] = useState(false);
  const clockLabelRef = useRef("00:00 · pre");
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    clockLabelRef.current = buildClockLabel(phase, firstHalfSec, secondHalfSec);
  }, [phase, firstHalfSec, secondHalfSec]);

  useEffect(() => {
    if (!active || !running) {
      lastTickRef.current = null;
      return;
    }
    if (phase !== "first_half" && phase !== "second_half") {
      lastTickRef.current = null;
      return;
    }
    // Anchor on first tick, then advance the anchor by whole seconds consumed
    // so sub-second remainder carries across 250 ms ticks and the counter
    // actually increments once per real-world second.
    if (lastTickRef.current == null) {
      lastTickRef.current = Date.now();
    }
    const id = window.setInterval(() => {
      const now = Date.now();
      const prev = lastTickRef.current ?? now;
      const deltaMs = now - prev;
      const deltaSec = Math.max(0, Math.floor(deltaMs / 1000));
      if (deltaSec <= 0) return;
      // Advance the anchor by exactly the whole seconds we consumed, keeping the
      // remainder for the next tick. Do NOT set `lastTickRef.current = now`.
      lastTickRef.current = prev + deltaSec * 1000;
      if (phase === "first_half") {
        setFirstHalfSec((t) => t + deltaSec);
      } else {
        setSecondHalfSec((t) => t + deltaSec);
      }
    }, 250);
    return () => {
      window.clearInterval(id);
      lastTickRef.current = null;
    };
  }, [active, running, phase]);

  return {
    phase,
    setPhase,
    firstHalfSec,
    secondHalfSec,
    running,
    setRunning,
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
