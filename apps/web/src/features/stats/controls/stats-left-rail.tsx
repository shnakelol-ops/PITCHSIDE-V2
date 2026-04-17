"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PitchSport } from "@/config/pitchConfig";
import type { SimulatorMatchPhase } from "@src/features/stats/hooks/use-simulator-match-clock";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

import { StatsUtilitySummary } from "@src/features/stats/controls/stats-utility-summary";

/** Shared button token — tight, premium. */
const BTN_BASE =
  "min-h-9 w-full justify-center rounded-[10px] px-3 py-2 text-[11px] font-semibold leading-tight tracking-[0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)] transition-[transform,box-shadow,background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45";

const BTN_IDLE =
  "!border !border-white/[0.06] !bg-[rgba(22,26,32,0.92)] !text-[rgba(230,234,242,0.92)] hover:!border-white/[0.12] hover:!bg-[rgba(30,34,42,0.96)] hover:!text-white";

const BTN_PRIMARY =
  "!border !border-[rgba(90,167,255,0.3)] !bg-[rgba(30,52,82,0.9)] !text-[rgba(208,228,250,0.98)] hover:!border-[rgba(90,167,255,0.4)] hover:!bg-[rgba(34,58,92,0.94)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(90,167,255,0.08)]";

const BTN_AMBER =
  "!border !border-amber-400/25 !bg-[rgba(48,36,18,0.9)] !text-[rgba(254,243,199,0.96)] hover:!border-amber-300/35 hover:!bg-[rgba(54,40,20,0.94)]";

const REVIEW_CHIPS: { mode: StatsReviewMode; label: string }[] = [
  { mode: "live", label: "Live" },
  { mode: "halftime", label: "HT" },
  { mode: "full_time", label: "FT" },
];

const SPORT_OPTIONS: { id: PitchSport; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic" },
  { id: "hurling", label: "Hurling" },
];

function RailSection({
  title,
  children,
  dense,
}: {
  title: string;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative flex flex-col gap-2 overflow-hidden rounded-[12px] border border-white/[0.06] px-2.5 py-2 backdrop-blur-[6px]",
        dense && "gap-1.5",
      )}
      style={{
        backgroundColor: "rgba(14,17,22,0.72)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 28px -16px rgba(0,0,0,0.55)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(148,185,230,0.16) 50%, transparent 100%)",
        }}
        aria-hidden
      />
      <div className="flex items-center gap-2 border-b border-white/[0.05] pb-1.5">
        <span
          className="h-3 w-[2px] shrink-0 rounded-full bg-gradient-to-b from-[rgba(90,167,255,0.55)] to-[rgba(90,167,255,0.12)]"
          aria-hidden
        />
        <div
          className="text-[9px] font-semibold uppercase leading-none tracking-[0.24em] text-[rgba(228,232,240,0.78)]"
          style={{ fontFeatureSettings: '"ss01" 1' }}
        >
          {title}
        </div>
      </div>
      {children}
    </section>
  );
}

export type StatsLeftRailProps = {
  // Sport (kept minimal; placed in the utility footer)
  sport: PitchSport;
  onChangeSport: (sport: PitchSport) => void;

  // Transport / match state
  matchPhase: SimulatorMatchPhase;
  matchClockRunning: boolean;
  matchClockDisplay: string;
  onStartMatch: () => void;
  onStopMatchClock: () => void;
  onResumeMatchClock: () => void;
  onHalfTime: () => void;
  onStartSecondHalf: () => void;
  onFullTime: () => void;

  // Review mode
  reviewMode: StatsReviewMode;
  setReviewMode: (mode: StatsReviewMode) => void;

  // Utility summary source
  statsEvents: readonly StatsLoggedEvent[];
};

function phaseShort(phase: SimulatorMatchPhase): string {
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
 * Slim operational rail (~208px). Sections:
 *   1. Match State / Transport
 *   2. Review bubble (Live / HT / FT — the single source of truth for review mode)
 *   3. Tiny utility summary (wides / kickouts / turnovers)
 *
 * No dashboards. No charts. No crowded buttons.
 */
export function StatsLeftRail({
  sport,
  onChangeSport,
  matchPhase,
  matchClockRunning,
  matchClockDisplay,
  onStartMatch,
  onStopMatchClock,
  onResumeMatchClock,
  onHalfTime,
  onStartSecondHalf,
  onFullTime,
  reviewMode,
  setReviewMode,
  statsEvents,
}: StatsLeftRailProps) {
  const [sportOpen, setSportOpen] = useState(false);
  const isPlayable = matchPhase === "first_half" || matchPhase === "second_half";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      {/* ── Section 1 — Match State / Transport ── */}
      <RailSection title="Match State">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 rounded-[8px] border border-white/[0.05] bg-black/25 px-2 py-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-300/85">
              {phaseShort(matchPhase)}
            </span>
            <span className="font-mono text-[10.5px] font-semibold tabular-nums tracking-[0.04em] text-emerald-200/90">
              {matchClockDisplay}
            </span>
          </div>

          <div className="flex flex-col gap-1.5" role="group" aria-label="Match transport">
            {matchPhase === "pre_match" ? (
              <Button
                type="button"
                variant="secondary"
                className={cn(BTN_BASE, BTN_PRIMARY)}
                onClick={onStartMatch}
              >
                Start Match
              </Button>
            ) : null}
            {isPlayable && matchClockRunning ? (
              <Button
                type="button"
                variant="secondary"
                className={cn(BTN_BASE, BTN_IDLE)}
                onClick={onStopMatchClock}
              >
                Pause
              </Button>
            ) : null}
            {isPlayable && !matchClockRunning ? (
              <Button
                type="button"
                variant="secondary"
                className={cn(BTN_BASE, BTN_PRIMARY)}
                onClick={onResumeMatchClock}
              >
                Resume
              </Button>
            ) : null}
            {matchPhase === "first_half" ? (
              <Button
                type="button"
                variant="secondary"
                className={cn(BTN_BASE, BTN_AMBER)}
                onClick={onHalfTime}
              >
                Half Time
              </Button>
            ) : null}
            {matchPhase === "halftime" ? (
              <Button
                type="button"
                variant="secondary"
                className={cn(BTN_BASE, BTN_PRIMARY)}
                onClick={onStartSecondHalf}
              >
                Resume 2nd Half
              </Button>
            ) : null}
            {matchPhase === "second_half" ? (
              <Button
                type="button"
                variant="secondary"
                className={cn(BTN_BASE, BTN_AMBER)}
                onClick={onFullTime}
              >
                Full Time
              </Button>
            ) : null}
          </div>
        </div>
      </RailSection>

      {/* ── Section 2 — Review bubble ── */}
      <RailSection title="Review" dense>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Review mode">
          {REVIEW_CHIPS.map(({ mode, label }) => {
            const active = reviewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setReviewMode(mode)}
                className={cn(
                  "min-h-8 flex-1 rounded-[8px] border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
                  active
                    ? "border-[rgba(90,167,255,0.4)] bg-[rgba(90,167,255,0.1)] text-[rgba(208,228,250,0.98)]"
                    : "border-white/[0.08] bg-white/[0.02] text-slate-300/85 hover:border-white/[0.16] hover:bg-white/[0.06]",
                )}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="px-0.5 text-[9px] leading-snug text-slate-400/70">
          {reviewMode === "live"
            ? "Logging events to the pitch."
            : reviewMode === "halftime"
              ? "Reviewing first-half events."
              : "Reviewing full match events."}
        </p>
      </RailSection>

      {/* ── Section 3 — Utility summary ── */}
      <RailSection title="Summary" dense>
        <StatsUtilitySummary events={statsEvents} />
        {/* Very small pitch sport chip — reachable without adding header chrome. */}
        <div className="relative mt-1">
          <button
            type="button"
            onClick={() => setSportOpen((v) => !v)}
            aria-expanded={sportOpen}
            className={cn(
              "flex w-full items-center justify-between gap-1.5 rounded-[8px] border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-300/85 transition-colors",
              "hover:border-white/[0.12] hover:bg-white/[0.06]",
            )}
          >
            <span className="text-slate-400/70">Pitch</span>
            <span className="flex items-center gap-1 text-slate-100/95">
              {SPORT_OPTIONS.find((o) => o.id === sport)?.label ?? "Soccer"}
              <ChevronDown className="h-3 w-3 text-slate-400/70" strokeWidth={2} />
            </span>
          </button>
          {sportOpen ? (
            <div
              role="menu"
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 flex flex-col gap-0.5 rounded-[10px] border border-white/[0.08] bg-[rgba(14,17,22,0.98)] p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[8px]"
            >
              {SPORT_OPTIONS.map((o) => {
                const active = sport === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChangeSport(o.id);
                      setSportOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[7px] px-2 py-1.5 text-left text-[10px] font-medium transition-colors",
                      active
                        ? "bg-[rgba(90,167,255,0.12)] text-[rgba(188,214,246,0.98)]"
                        : "text-slate-200/90 hover:bg-white/[0.06]",
                    )}
                  >
                    <span>{o.label}</span>
                    {active ? (
                      <span className="size-1.5 rounded-full bg-[rgba(90,167,255,0.85)] shadow-[0_0_6px_rgba(90,167,255,0.5)]" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </RailSection>
    </div>
  );
}
