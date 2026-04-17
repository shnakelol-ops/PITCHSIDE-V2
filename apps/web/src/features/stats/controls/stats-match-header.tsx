"use client";

import type { SimulatorMatchPhase } from "@src/features/stats/hooks/use-simulator-match-clock";
import { cn } from "@pitchside/utils";

export type StatsMatchHeaderProps = {
  matchPhase: SimulatorMatchPhase;
  /** Pre-formatted display (e.g. "1H 12:34" or "—"). */
  matchClockDisplay: string;
  matchClockRunning: boolean;
  /** True while logging is allowed (live phase + match running). Drives the live pulse. */
  canStatsPitchLog: boolean;
  /** Optional: tiny "Exit" affordance for the parent (rendered in the right slot edge). */
  onExitStatsMode?: () => void;
};

function phaseLabel(phase: SimulatorMatchPhase): string {
  switch (phase) {
    case "pre_match":
      return "Pre Match";
    case "first_half":
      return "1st Half";
    case "halftime":
      return "Half Time";
    case "second_half":
      return "2nd Half";
    case "full_time":
      return "Full Time";
  }
}

/**
 * Fixed top strip — broadcast clarity.
 *
 * Data sources (V1, no guessing):
 *   - phase/clock: `useSimulatorMatchClock` (`matchPhase`, `matchClockDisplay`)
 *   - live pulse: `canStatsPitchLog && matchClockRunning`
 *
 * Team-score slots are structural placeholders: V1 `StatsLoggedEvent` has no
 * team-side field, so no score numbers are rendered here. See handoff notes.
 */
export function StatsMatchHeader({
  matchPhase,
  matchClockDisplay,
  matchClockRunning,
  canStatsPitchLog,
  onExitStatsMode,
}: StatsMatchHeaderProps) {
  const isLivePulse = canStatsPitchLog && matchClockRunning;

  return (
    <header
      className={cn(
        "relative z-20 flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 py-2.5 backdrop-blur-[8px] sm:px-6 sm:py-3",
      )}
      style={{
        backgroundColor: "rgba(10,13,18,0.78)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 22px -14px rgba(0,0,0,0.6)",
      }}
      aria-label="Stats match header"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(148,185,230,0.18) 50%, transparent 100%)",
        }}
        aria-hidden
      />

      {/* LEFT — Team A slot (structural, no score until V1 wires team-side). */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className="inline-flex h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-[rgba(90,167,255,0.85)] to-[rgba(90,167,255,0.18)]"
          aria-hidden
        />
        <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.24em] text-slate-400/80">
          Home
        </span>
      </div>

      {/* CENTER — phase + clock + live pulse (real V1 data). */}
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase leading-none tracking-[0.2em]",
              isLivePulse
                ? "border-[rgba(90,167,255,0.35)] bg-[rgba(90,167,255,0.1)] text-[rgba(188,214,246,0.96)]"
                : "border-white/[0.08] bg-white/[0.03] text-slate-300/80",
            )}
          >
            {isLivePulse ? (
              <span
                className="size-1.5 shrink-0 rounded-full bg-[rgba(90,167,255,0.95)] shadow-[0_0_8px_rgba(90,167,255,0.8)] motion-safe:animate-pulse"
                aria-hidden
              />
            ) : null}
            {isLivePulse ? "Live" : phaseLabel(matchPhase)}
          </span>
          <span
            className="font-mono text-[13px] font-semibold tabular-nums tracking-[0.06em] text-white/95 sm:text-sm"
            aria-label="Match clock"
          >
            {matchClockDisplay}
          </span>
        </div>
        <span className="text-[8.5px] font-medium uppercase tracking-[0.22em] text-slate-500/80">
          {isLivePulse ? phaseLabel(matchPhase) : matchClockRunning ? "Running" : "Stopped"}
        </span>
      </div>

      {/* RIGHT — Team B slot (structural) + tiny optional exit affordance. */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
        <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.24em] text-slate-400/80">
          Away
        </span>
        <span
          className="inline-flex h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-[rgba(148,185,230,0.55)] to-[rgba(148,185,230,0.1)]"
          aria-hidden
        />
        {onExitStatsMode ? (
          <button
            type="button"
            onClick={onExitStatsMode}
            className={cn(
              "ml-1 inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400/80 transition-colors",
              "hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-slate-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12]",
            )}
            aria-label="Exit stats mode"
            title="Simulator"
          >
            Sim
          </button>
        ) : null}
      </div>
    </header>
  );
}
