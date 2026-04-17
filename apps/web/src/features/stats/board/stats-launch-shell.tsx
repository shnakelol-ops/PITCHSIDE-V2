"use client";

import { useState, type MutableRefObject, type ReactNode } from "react";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { PitchSport } from "@/config/pitchConfig";
import {
  SimulatorPixiSurface,
  type SimulatorPixiSurfaceHandle,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
import type { StatsArmSelection } from "@src/features/stats/hooks/use-stats-event-log";
import type { SimulatorMatchPhase } from "@src/features/stats/hooks/use-simulator-match-clock";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import type {
  StatsV1EventKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";
import type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

import { StatsMatchHeader } from "@src/features/stats/controls/stats-match-header";
import { StatsLeftRail } from "@src/features/stats/controls/stats-left-rail";
import { StatsRightRail } from "@src/features/stats/controls/stats-right-rail";
import { StatsActionBar } from "@src/features/stats/controls/stats-action-bar";

/**
 * Launch layout shell for Stats mode only.
 *
 * Geometry:
 *   ┌────────────────────── header ─────────────────────┐
 *   │ left rail │   central pitch stage   │ right rail  │
 *   └────────────── bottom action bar ──────────────────┘
 *
 * The simulator shell (see `SimulatorBoardShell`) routes here when `surfaceMode === "STATS"`.
 * All state/handlers are owned by the parent shell; this component is presentational.
 */
export type StatsLaunchShellProps = {
  // Pitch surface props
  surfaceRef: MutableRefObject<SimulatorPixiSurfaceHandle | null>;
  pitchHostRef: MutableRefObject<HTMLDivElement | null>;
  sport: PitchSport;
  onChangeSport: (sport: PitchSport) => void;

  // Match clock / phase
  matchPhase: SimulatorMatchPhase;
  matchClockDisplay: string;
  matchClockRunning: boolean;
  onStartMatch: () => void;
  onStopMatchClock: () => void;
  onResumeMatchClock: () => void;
  onHalfTime: () => void;
  onStartSecondHalf: () => void;
  onFullTime: () => void;

  // Event log / scorer / voice / review
  statsEvents: readonly StatsLoggedEvent[];
  statsEventsForPitchView: readonly StatsLoggedEvent[];
  statsArm: StatsArmSelection;
  activeScorerId: string | null;
  reviewMode: StatsReviewMode;
  canStatsPitchLog: boolean;
  pendingScoreLabel: string | null;
  lastStatsEvent: StatsLoggedEvent | undefined;

  armKind: (kind: StatsV1EventKind) => void;
  clearArm: () => void;
  undoLastEvent: () => void;
  resetEvents: () => void;
  setActiveScorer: (playerId: string | null) => void;
  setReviewMode: (mode: StatsReviewMode) => void;
  onStatsPitchTap: (payload: StatsPitchTapPayload) => void;

  // Voice
  voiceIsRecording: boolean;
  voiceError: string | null;
  pendingVoiceId: string | null;
  canAttachVoiceToLastEvent: boolean;
  voiceMomentIds: readonly string[];
  eventsWithVoice: readonly StatsLoggedEvent[];
  onStartVoice: () => void;
  onStopVoice: () => void;
  onAttachVoiceToLastEvent: () => void;
  onAttachVoiceAsMoment: () => void;
  onDiscardPendingVoice: () => void;
  onPlayVoice: (voiceNoteId: string) => void;

  // Roster
  players: readonly StatsRosterPlayer[];

  // Pitch marker filter (review)
  pitchMarkerViewFilter: "all" | StatsV1EventKind;
  onSetPitchMarkerViewFilter: (filter: "all" | StatsV1EventKind) => void;

  // Persist error surfaced from the parent shell
  statsPersistError: string | null;

  // Mode toggle up to parent (e.g. switch to Simulator)
  onExitStatsMode?: () => void;
};

/** Token palette kept in one place for Stats launch layout cohesion. */
const STATS_TOKENS = {
  shellBg: "#070A0E",
  // Slight blue/cyan lift near the top of the shell
  shellRadial:
    "radial-gradient(ellipse 95% 55% at 50% -8%, rgba(90,167,255,0.06), transparent 62%), radial-gradient(ellipse 70% 55% at 50% 110%, rgba(6,8,11,0.8), transparent 58%)",
};

/**
 * Frame behind the central pitch — premium analysis surface.
 * Slightly brighter than the shell so the pitch feels alive.
 */
function PitchStageFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/[0.06] p-3 sm:p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(20,26,34,0.85) 0%, rgba(12,16,22,0.92) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.35), 0 24px 60px -28px rgba(0,0,0,0.55)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(148,185,230,0.18) 50%, transparent 100%)",
        }}
        aria-hidden
      />
      {children}
    </div>
  );
}

export function StatsLaunchShell(props: StatsLaunchShellProps) {
  const {
    surfaceRef,
    pitchHostRef,
    sport,
    onChangeSport,
    matchPhase,
    matchClockDisplay,
    matchClockRunning,
    onStartMatch,
    onStopMatchClock,
    onResumeMatchClock,
    onHalfTime,
    onStartSecondHalf,
    onFullTime,
    statsEvents,
    statsEventsForPitchView,
    statsArm,
    activeScorerId,
    reviewMode,
    canStatsPitchLog,
    pendingScoreLabel,
    lastStatsEvent,
    armKind,
    clearArm,
    undoLastEvent,
    resetEvents,
    setActiveScorer,
    setReviewMode,
    onStatsPitchTap,
    voiceIsRecording,
    voiceError,
    pendingVoiceId,
    canAttachVoiceToLastEvent,
    voiceMomentIds,
    eventsWithVoice,
    onStartVoice,
    onStopVoice,
    onAttachVoiceToLastEvent,
    onAttachVoiceAsMoment,
    onDiscardPendingVoice,
    onPlayVoice,
    players,
    pitchMarkerViewFilter,
    onSetPitchMarkerViewFilter,
    statsPersistError,
    onExitStatsMode,
  } = props;

  // Mobile/tablet: rails collapse into sheets. Sheets close automatically
  // when navigating/logging so they don't linger over the pitch.
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);

  const leftRail = (
    <StatsLeftRail
      sport={sport}
      onChangeSport={onChangeSport}
      matchPhase={matchPhase}
      matchClockRunning={matchClockRunning}
      matchClockDisplay={matchClockDisplay}
      onStartMatch={onStartMatch}
      onStopMatchClock={onStopMatchClock}
      onResumeMatchClock={onResumeMatchClock}
      onHalfTime={onHalfTime}
      onStartSecondHalf={onStartSecondHalf}
      onFullTime={onFullTime}
      reviewMode={reviewMode}
      setReviewMode={setReviewMode}
      statsEvents={statsEvents}
    />
  );

  const rightRail = (
    <StatsRightRail
      players={players}
      activeScorerId={activeScorerId}
      pendingScoreLabel={pendingScoreLabel}
      onSetActiveScorer={setActiveScorer}
      voiceIsRecording={voiceIsRecording}
      voiceError={voiceError}
      pendingVoiceId={pendingVoiceId}
      canAttachVoiceToLastEvent={canAttachVoiceToLastEvent}
      canRecordVoice={canStatsPitchLog}
      voiceMomentIds={voiceMomentIds}
      eventsWithVoice={eventsWithVoice}
      onStartVoice={onStartVoice}
      onStopVoice={onStopVoice}
      onAttachVoiceToLastEvent={onAttachVoiceToLastEvent}
      onAttachVoiceAsMoment={onAttachVoiceAsMoment}
      onDiscardPendingVoice={onDiscardPendingVoice}
      onPlayVoice={onPlayVoice}
      statsEvents={statsEvents}
      reviewMode={reviewMode}
      pitchMarkerViewFilter={pitchMarkerViewFilter}
      onSetPitchMarkerViewFilter={onSetPitchMarkerViewFilter}
      canUndo={canStatsPitchLog && statsEvents.length > 0}
      onUndoLast={undoLastEvent}
      canClearArm={canStatsPitchLog}
      onClearArm={clearArm}
      canResetEvents={statsEvents.length > 0}
      onResetEvents={resetEvents}
      lastStatsEvent={lastStatsEvent}
    />
  );

  return (
    <div
      className={cn(
        "relative grid h-[100dvh] min-h-0 w-full overflow-hidden text-slate-200",
        // rows: header | main | bottom action bar
        "grid-rows-[auto_1fr_auto]",
      )}
      style={{
        backgroundColor: STATS_TOKENS.shellBg,
        backgroundImage: STATS_TOKENS.shellRadial,
      }}
    >
      {/* Subtle vignette — shell only, pitch keeps its own treatment */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)",
        }}
        aria-hidden
      />

      {/* ═══════════ HEADER ═══════════ */}
      <StatsMatchHeader
        matchPhase={matchPhase}
        matchClockDisplay={matchClockDisplay}
        matchClockRunning={matchClockRunning}
        canStatsPitchLog={canStatsPitchLog}
        onExitStatsMode={onExitStatsMode}
      />

      {/* ═══════════ MAIN ═══════════ */}
      <main
        className={cn(
          "relative z-10 grid min-h-0 w-full gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3",
          // Mobile: single column; tablet: 2-col (rail overlay handled in Phase 7);
          // desktop/laptop: 3-col with fixed rails and flexible pitch
          "lg:grid-cols-[208px_minmax(0,1fr)_312px] lg:gap-4 lg:px-5 xl:gap-5 xl:px-6",
          // Hide rails on small screens (Phase 7 will add a utility sheet)
          "[&>aside.rail-left]:hidden [&>aside.rail-right]:hidden",
          "lg:[&>aside.rail-left]:block lg:[&>aside.rail-right]:block",
        )}
      >
        {/* LEFT RAIL */}
        <aside className="rail-left relative z-10 min-h-0">{leftRail}</aside>

        {/* CENTRAL PITCH STAGE */}
        <div className="relative z-10 flex min-h-0 min-w-0 flex-col">
          {/* Mobile/tablet rail triggers — hidden on desktop. */}
          <div className="mb-2 flex items-center justify-between gap-2 lg:hidden">
            <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open match controls"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300/85 transition-colors",
                    "hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-slate-100",
                  )}
                >
                  <PanelLeftOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  Controls
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[88vw] max-w-[320px] overflow-y-auto border-white/[0.08] bg-[rgba(10,13,18,0.98)] p-3 text-slate-100 backdrop-blur-[10px]"
              >
                <SheetHeader>
                  <SheetTitle className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300/85">
                    Match Controls
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-3">{leftRail}</div>
              </SheetContent>
            </Sheet>
            <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open scorer, voice and recent events"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300/85 transition-colors",
                    "hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-slate-100",
                  )}
                >
                  Scorer & Voice
                  <PanelRightOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[92vw] max-w-[360px] overflow-y-auto border-white/[0.08] bg-[rgba(10,13,18,0.98)] p-3 text-slate-100 backdrop-blur-[10px]"
              >
                <SheetHeader>
                  <SheetTitle className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300/85">
                    Workflow
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-3">{rightRail}</div>
              </SheetContent>
            </Sheet>
          </div>

          <PitchStageFrame>
            <div
              ref={pitchHostRef}
              className={cn(
                "relative flex w-full items-center justify-center overflow-hidden rounded-[1rem]",
                !canStatsPitchLog && "ring-2 ring-amber-400/25 ring-offset-0",
              )}
              style={{
                // Brighter canvas well than current simulator treatment
                backgroundColor: "#20271E",
                boxShadow: [
                  "inset 0 0 0 1px rgba(252,248,240,0.55)",
                  "inset 0 0 0 2px rgba(111,143,90,0.7)",
                  "inset 0 14px 36px -4px rgba(0,0,0,0.22)",
                  "inset 0 5px 14px rgba(0,0,0,0.08)",
                ].join(", "),
              }}
            >
              <SimulatorPixiSurface
                ref={surfaceRef}
                sport={sport}
                recordingMode={false}
                shadowRecordingMode={false}
                surfaceMode="STATS"
                statsArm={statsArm}
                statsLoggedEvents={statsEventsForPitchView}
                onStatsPitchTap={onStatsPitchTap}
                statsReviewMode={reviewMode}
                statsPitchInteractive={canStatsPitchLog}
                className="max-h-[min(70dvh,calc(100dvw-2.5rem))] w-full !rounded-[0.9rem] !border-0 !bg-transparent !shadow-none !ring-0 sm:max-h-[min(74dvh,80vw)] lg:max-h-[min(80dvh,62rem)]"
              />
            </div>
          </PitchStageFrame>

          {statsPersistError ? (
            <p
              role="status"
              className="mx-auto mt-2 max-w-md rounded-[8px] border border-red-400/28 bg-red-950/35 px-2.5 py-1.5 text-center text-[10px] font-medium leading-snug text-red-100/95"
            >
              Save failed: {statsPersistError}
            </p>
          ) : null}
        </div>

        {/* RIGHT RAIL */}
        <aside className="rail-right relative z-10 min-h-0">{rightRail}</aside>
      </main>

      {/* ═══════════ BOTTOM ACTION BAR ═══════════ */}
      <StatsActionBar
        armedKind={statsArm}
        canLog={canStatsPitchLog}
        onArm={armKind}
      />
    </div>
  );
}
