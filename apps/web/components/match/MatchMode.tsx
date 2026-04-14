"use client";

import { useEffect, useMemo, useState } from "react";

import { MatchPeriod } from "@pitchside/data-access";
import { cn } from "@pitchside/utils";
import {
  createMatchClockState,
  formatClock,
  getElapsedSeconds,
  pauseClock,
  resetClock,
  resumeClock,
  startClock,
  type MatchClockState,
  ZERO_CLOCK,
} from "@/lib/matchClock";

const MODE_LABELS: Record<MatchPeriod, string> = {
  WARMUP: "Warm-up",
  FIRST_HALF: "1st Half",
  HALF_TIME: "Half-time",
  SECOND_HALF: "2nd Half",
  EXTRA_TIME_FIRST: "ET 1",
  EXTRA_TIME_SECOND: "ET 2",
  PENALTIES: "Penalties",
  FULL_TIME: "Full-time",
};

const ORDERED_MODES: MatchPeriod[] = [
  MatchPeriod.WARMUP,
  MatchPeriod.FIRST_HALF,
  MatchPeriod.HALF_TIME,
  MatchPeriod.SECOND_HALF,
  MatchPeriod.EXTRA_TIME_FIRST,
  MatchPeriod.EXTRA_TIME_SECOND,
  MatchPeriod.PENALTIES,
  MatchPeriod.FULL_TIME,
];

/** Coerces DB/string values to a known MatchPeriod for shared consumers. */
export function normalizeMatchPeriod(
  input: MatchPeriod | string | null | undefined,
): MatchPeriod {
  if (input == null) return MatchPeriod.FIRST_HALF;
  const key = String(input);
  const hit = ORDERED_MODES.find((mode) => String(mode) === key);
  return hit ?? MatchPeriod.FIRST_HALF;
}

type MatchModeProps = {
  value: MatchPeriod;
  onChange: (mode: MatchPeriod) => void;
  onClockChange?: (payload: {
    state: MatchClockState;
    elapsedSeconds: number;
    formatted: string;
  }) => void;
  disabled?: boolean;
  className?: string;
};

export function MatchMode({
  value,
  onChange,
  onClockChange,
  disabled = false,
  className,
}: MatchModeProps) {
  const [clockState, setClockState] = useState<MatchClockState>(
    createMatchClockState(),
  );
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    if (!clockState.isRunning) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, [clockState.isRunning]);

  const elapsedSeconds = useMemo(
    () => getElapsedSeconds(clockState, nowMs),
    [clockState, nowMs],
  );
  const clockDisplay = useMemo(
    () => formatClock(elapsedSeconds),
    [elapsedSeconds],
  );

  useEffect(() => {
    onClockChange?.({
      state: clockState,
      elapsedSeconds,
      formatted: clockDisplay,
    });
  }, [clockDisplay, clockState, elapsedSeconds, onClockChange]);

  const canStart = !disabled && !clockState.isRunning;
  const canPause = !disabled && clockState.isRunning;
  const canReset = !disabled && (clockState.isRunning || elapsedSeconds > 0);

  const handleStart = () => {
    setClockState((current) => {
      const now = Date.now();
      return current.elapsedMs > 0 ? resumeClock(current, now) : startClock(current, now);
    });
    setNowMs(Date.now());
  };

  const handlePause = () => {
    setClockState((current) => pauseClock(current, Date.now()));
    setNowMs(Date.now());
  };

  const handleReset = () => {
    setClockState(resetClock());
    setNowMs(Date.now());
  };

  return (
    <section
      aria-label="Match mode"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Match mode
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {ORDERED_MODES.map((mode) => {
          const active = value === mode;
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => onChange(mode)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-medium transition",
                "border-slate-200 text-slate-700 hover:border-pitchside-300 hover:text-pitchside-700",
                "dark:border-slate-700 dark:text-slate-200 dark:hover:border-pitchside-700 dark:hover:text-pitchside-300",
                "disabled:cursor-not-allowed disabled:opacity-50",
                active &&
                  "border-pitchside-500 bg-pitchside-50 text-pitchside-800 dark:border-pitchside-500 dark:bg-pitchside-950/40 dark:text-pitchside-200",
              )}
              aria-pressed={active}
            >
              {MODE_LABELS[mode]}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          Clock {clockDisplay || ZERO_CLOCK}
        </span>
        <button
          type="button"
          disabled={!canStart}
          onClick={handleStart}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-pitchside-300 hover:text-pitchside-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-pitchside-700 dark:hover:text-pitchside-300"
        >
          Start
        </button>
        <button
          type="button"
          disabled={!canPause}
          onClick={handlePause}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-pitchside-300 hover:text-pitchside-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-pitchside-700 dark:hover:text-pitchside-300"
        >
          Pause
        </button>
        <button
          type="button"
          disabled={!canReset}
          onClick={handleReset}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-pitchside-300 hover:text-pitchside-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-pitchside-700 dark:hover:text-pitchside-300"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
