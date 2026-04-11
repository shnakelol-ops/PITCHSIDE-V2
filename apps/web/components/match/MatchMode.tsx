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
import { MATCH_PERIOD_LABELS } from "@/lib/match-period-labels";

const MODE_LABELS = MATCH_PERIOD_LABELS as Record<MatchPeriod, string>;

/** Canonical order for UI; use for labels, keys, and period coercion. */
export const MATCH_MODE_PHASES: readonly MatchPeriod[] = [
  MatchPeriod.WARMUP,
  MatchPeriod.FIRST_HALF,
  MatchPeriod.HALF_TIME,
  MatchPeriod.SECOND_HALF,
  MatchPeriod.EXTRA_TIME_FIRST,
  MatchPeriod.EXTRA_TIME_SECOND,
  MatchPeriod.PENALTIES,
  MatchPeriod.FULL_TIME,
] as const;

/**
 * Coerces RSC/JSON string values and unknown DB values to a known phase so
 * `===` active styling and selection stay in sync with button keys.
 */
export function normalizeMatchPeriod(
  input: MatchPeriod | string | null | undefined,
): MatchPeriod {
  if (input == null) return MatchPeriod.FIRST_HALF;
  const key = String(input);
  const hit = MATCH_MODE_PHASES.find((m) => String(m) === key);
  return hit ?? MatchPeriod.FIRST_HALF;
}

type MatchModeProps = {
  value: MatchPeriod;
  onChange: (mode: MatchPeriod) => void | Promise<void>;
  onClockChange?: (payload: {
    state: MatchClockState;
    elapsedSeconds: number;
    formatted: string;
  }) => void;
  /** Disables phase chips and clock (read-only workspace). */
  disabled?: boolean;
  /** Disables only phase chips while a phase write is in flight; clock stays usable. */
  disablePhaseSelection?: boolean;
  className?: string;
  /** When true, drops outer card chrome (nest inside a parent panel card). */
  embedded?: boolean;
};

export function MatchMode({
  value,
  onChange,
  onClockChange,
  disabled = false,
  disablePhaseSelection = false,
  className,
  embedded = false,
}: MatchModeProps) {
  const selectedPeriod = normalizeMatchPeriod(value);
  const phaseDisabled = disabled || disablePhaseSelection;

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

  // Clock stays independent of phase: mode changes do not pause/reset (see handlers).
  // Only the explicit `disabled` prop gates controls (e.g. future read-only workspace).
  const canStart = !disabled && !clockState.isRunning;
  const canPause = !disabled && clockState.isRunning;
  const canReset =
    !disabled && (clockState.isRunning || clockState.elapsedMs > 0 || elapsedSeconds > 0);

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

  const Root = embedded ? "div" : "section";

  return (
    <Root
      role={embedded ? "group" : undefined}
      aria-label="Match control"
      className={cn(
        embedded
          ? "space-y-4"
          : "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      {!embedded ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Match control
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5">
        {MATCH_MODE_PHASES.map((mode) => {
          const active = mode === selectedPeriod;
          return (
            <button
              key={mode}
              type="button"
              disabled={phaseDisabled}
              onClick={() => onChange(mode)}
              className={cn(
                "min-h-[2.5rem] rounded-xl border px-3 py-2 text-xs font-medium transition",
                "border-slate-200 text-slate-700 hover:border-pitchside-300 hover:text-pitchside-700",
                "dark:border-slate-700 dark:text-slate-200 dark:hover:border-pitchside-700 dark:hover:text-pitchside-300",
                "disabled:cursor-not-allowed disabled:opacity-50",
                active &&
                  "z-[1] border-pitchside-500 bg-pitchside-50 text-pitchside-800 ring-2 ring-pitchside-500/35 ring-offset-2 ring-offset-white dark:border-pitchside-500 dark:bg-pitchside-950/40 dark:text-pitchside-200 dark:ring-offset-slate-950",
              )}
              aria-pressed={active}
            >
              {MODE_LABELS[mode]}
            </button>
          );
        })}
      </div>
      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Match clock
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span
            className="min-w-[5.5rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-2xl font-semibold tabular-nums tracking-tight text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            aria-live={clockState.isRunning ? "polite" : "off"}
            aria-label={`Elapsed time ${clockDisplay || ZERO_CLOCK}`}
          >
            {clockDisplay || ZERO_CLOCK}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canStart}
              onClick={handleStart}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-pitchside-300 hover:text-pitchside-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-pitchside-700 dark:hover:text-pitchside-300"
            >
              Start
            </button>
            <button
              type="button"
              disabled={!canPause}
              onClick={handlePause}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-pitchside-300 hover:text-pitchside-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-pitchside-700 dark:hover:text-pitchside-300"
            >
              Pause
            </button>
            <button
              type="button"
              disabled={!canReset}
              onClick={handleReset}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-pitchside-300 hover:text-pitchside-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-pitchside-700 dark:hover:text-pitchside-300"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </Root>
  );
}
