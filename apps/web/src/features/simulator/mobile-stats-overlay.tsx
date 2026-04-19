"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { PitchSport } from "@/config/pitchConfig";
import { StatsScorerStrip } from "@src/features/stats/controls/stats-scorer-strip";
import { StatsVoiceStrip } from "@src/features/stats/controls/stats-voice-strip";
import type { SimulatorSurfaceMode } from "@src/features/simulator/pixi/simulator-pixi-surface";
import type { SimulatorMatchPhase } from "@src/features/stats/hooks/use-simulator-match-clock";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import {
  STATS_V1_FIELD_KINDS,
  STATS_V1_SCORE_KINDS,
  type StatsV1EventKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

const PITCH_OPTIONS: { id: PitchSport; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic" },
  { id: "hurling", label: "Hurling" },
];

const STATS_REVIEW_CHIPS: { mode: StatsReviewMode; label: string }[] = [
  { mode: "live", label: "Live" },
  { mode: "halftime", label: "HT" },
  { mode: "full_time", label: "FT" },
];

type PitchMarkerViewFilter = "all" | StatsV1EventKind;

const PITCH_VIEW_FILTER_CHIPS: {
  id: PitchMarkerViewFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  ...STATS_V1_FIELD_KINDS.map((k) => ({
    id: k,
    label: k.replace(/_/g, " "),
  })),
  ...STATS_V1_SCORE_KINDS.map((k) => ({
    id: k,
    label: k.replace(/_/g, " "),
  })),
];

type OverlayPanel = "menu" | "voice" | "log" | null;

function kindUiLabel(kind: string): string {
  return kind.replace(/_/g, " ").toLowerCase();
}

function formatMatchPhaseLabel(phase: string): string {
  return phase.replace(/_/g, " ");
}

function bubbleButtonClass(active: boolean): string {
  return cn(
    "min-h-10 rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.86)]",
    active
      ? "border-amber-300/60 bg-[rgba(72,56,32,0.82)] text-amber-50"
      : "border-white/20 bg-[rgba(26,30,38,0.86)] text-stone-100",
  );
}

function reviewChipClass(active: boolean): string {
  return cn(
    "inline-flex min-h-7 items-center justify-center rounded-md border px-2 py-1 text-[8.5px] font-bold uppercase tracking-wide",
    active
      ? "border-amber-300/55 bg-[rgba(98,80,46,0.72)] text-amber-50"
      : "border-white/15 bg-[rgba(34,38,48,0.82)] text-stone-100",
  );
}

export type MobileStatsOverlayProps = {
  surfaceMode: SimulatorSurfaceMode;
  sport: PitchSport;
  pathRecording: boolean;
  shadowRecording: boolean;
  pitchExportError: string | null;
  matchPhase: SimulatorMatchPhase;
  matchClockDisplay: string;
  matchClockRunning: boolean;
  reviewMode: StatsReviewMode;
  isStatsLive: boolean;
  canStatsPitchLog: boolean;
  pitchMarkerViewFilter: PitchMarkerViewFilter;
  statsArm: StatsV1EventKind | null;
  statsEventsCount: number;
  statsPersistError: string | null;
  statsPlayers: StatsRosterPlayer[];
  playerNameDraft: string;
  playerNumberDraft: string;
  pendingScoreLabel: string | null;
  activeScorerId: string | null;
  isVoiceRecording: boolean;
  voiceError: string | null;
  pendingVoiceId: string | null;
  canAttachToLastEvent: boolean;
  voiceMomentIds: readonly string[];
  eventsWithVoice: readonly StatsLoggedEvent[];
  onSetMode: (mode: SimulatorSurfaceMode) => void;
  onSetSport: (sport: PitchSport) => void;
  onSetMainRecording: (on: boolean) => void;
  onSetShadowLineRecording: (on: boolean) => void;
  onExportPitchPng: () => void;
  onSharePitchPng: () => void;
  onSetReviewMode: (mode: StatsReviewMode) => void;
  onSetPitchMarkerViewFilter: (filter: PitchMarkerViewFilter) => void;
  onArmKind: (kind: StatsV1EventKind) => void;
  onClearArm: () => void;
  onUndoLastEvent: () => void;
  onResetEvents: () => void;
  onSetActiveScorer: (playerId: string | null) => void;
  onSetPlayerNameDraft: (value: string) => void;
  onSetPlayerNumberDraft: (value: string) => void;
  onAddStatsPlayer: () => void;
  onHalfTime: () => void;
  onStartSecondHalf: () => void;
  onFullTime: () => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onAttachVoiceToLastEvent: () => void;
  onAttachVoiceAsMoment: () => void;
  onDiscardPendingVoice: () => void;
  onPlayVoice: (voiceNoteId: string) => void;
};

export function MobileStatsOverlay({
  surfaceMode,
  sport,
  pathRecording,
  shadowRecording,
  pitchExportError,
  matchPhase,
  matchClockDisplay,
  matchClockRunning,
  reviewMode,
  isStatsLive,
  canStatsPitchLog,
  pitchMarkerViewFilter,
  statsArm,
  statsEventsCount,
  statsPersistError,
  statsPlayers,
  playerNameDraft,
  playerNumberDraft,
  pendingScoreLabel,
  activeScorerId,
  isVoiceRecording,
  voiceError,
  pendingVoiceId,
  canAttachToLastEvent,
  voiceMomentIds,
  eventsWithVoice,
  onSetMode,
  onSetSport,
  onSetMainRecording,
  onSetShadowLineRecording,
  onExportPitchPng,
  onSharePitchPng,
  onSetReviewMode,
  onSetPitchMarkerViewFilter,
  onArmKind,
  onClearArm,
  onUndoLastEvent,
  onResetEvents,
  onSetActiveScorer,
  onSetPlayerNameDraft,
  onSetPlayerNumberDraft,
  onAddStatsPlayer,
  onHalfTime,
  onStartSecondHalf,
  onFullTime,
  onStartVoice,
  onStopVoice,
  onAttachVoiceToLastEvent,
  onAttachVoiceAsMoment,
  onDiscardPendingVoice,
  onPlayVoice,
}: MobileStatsOverlayProps) {
  const [openPanel, setOpenPanel] = useState<OverlayPanel>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (surfaceMode === "STATS") return;
    if (openPanel === "voice" || openPanel === "log") {
      setOpenPanel(null);
    }
  }, [openPanel, surfaceMode]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (openPanel == null) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpenPanel(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openPanel]);

  const logPanelDisabled = !canStatsPitchLog;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-40">
      <div className="pointer-events-none absolute left-[max(0.45rem,env(safe-area-inset-left))] top-1/2 z-50 -translate-y-1/2">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            className={cn("pointer-events-auto", bubbleButtonClass(openPanel === "menu"))}
            aria-pressed={openPanel === "menu"}
            onClick={() => setOpenPanel((v) => (v === "menu" ? null : "menu"))}
          >
            Menu
          </Button>
          {surfaceMode === "STATS" ? (
            <Button
              type="button"
              variant="secondary"
              className={cn("pointer-events-auto", bubbleButtonClass(openPanel === "voice"))}
              aria-pressed={openPanel === "voice"}
              onClick={() => setOpenPanel((v) => (v === "voice" ? null : "voice"))}
            >
              Voice
            </Button>
          ) : null}
        </div>
      </div>

      {surfaceMode === "STATS" ? (
        <div className="pointer-events-none absolute right-[max(0.45rem,env(safe-area-inset-right))] top-1/2 z-50 -translate-y-1/2">
          <Button
            type="button"
            variant="secondary"
            className={cn("pointer-events-auto", bubbleButtonClass(openPanel === "log"))}
            aria-pressed={openPanel === "log"}
            onClick={() => setOpenPanel((v) => (v === "log" ? null : "log"))}
          >
            Log Event
          </Button>
        </div>
      ) : null}

      {openPanel === "menu" ? (
        <section
          className="pointer-events-auto absolute left-[max(0.45rem,env(safe-area-inset-left))] top-1/2 z-50 max-h-[min(80dvh,34rem)] w-[min(17rem,calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1.8rem))] -translate-y-1/2 overflow-y-auto rounded-[16px] border border-white/20 bg-[rgba(20,26,38,0.9)] p-2.5 shadow-[0_18px_42px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md"
          aria-label="Mobile menu controls"
        >
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                Mode
              </p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                  aria-pressed={surfaceMode === "SIMULATOR"}
                  onClick={() => onSetMode("SIMULATOR")}
                >
                  Sim
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                  aria-pressed={surfaceMode === "STATS"}
                  onClick={() => onSetMode("STATS")}
                >
                  Stats
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                Pitch
              </p>
              <div className="grid grid-cols-1 gap-1">
                {PITCH_OPTIONS.map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                    aria-pressed={sport === opt.id}
                    onClick={() => onSetSport(opt.id)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {surfaceMode === "SIMULATOR" ? (
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                  Capture
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                    aria-pressed={pathRecording}
                    onClick={() => onSetMainRecording(!pathRecording)}
                  >
                    Path
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                    aria-pressed={shadowRecording}
                    onClick={() => onSetShadowLineRecording(!shadowRecording)}
                  >
                    Shadow
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                    onClick={onExportPitchPng}
                  >
                    Export
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                    onClick={onSharePitchPng}
                  >
                    Share
                  </Button>
                </div>
                {pitchExportError ? (
                  <p role="status" className="text-[9px] text-amber-200/90">
                    {pitchExportError}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[9px] text-stone-200/80">
                  {formatMatchPhaseLabel(matchPhase)} ·{" "}
                  {matchClockRunning ? "running" : "stopped"}
                </div>

                <div className="grid grid-cols-4 gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[9px]"
                    aria-pressed={reviewMode === "live"}
                    onClick={() => onSetReviewMode("live")}
                  >
                    {matchClockDisplay}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={matchPhase !== "first_half"}
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[9px]"
                    onClick={onHalfTime}
                  >
                    HT
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={matchPhase !== "halftime"}
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[9px]"
                    onClick={onStartSecondHalf}
                  >
                    2H
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={matchPhase !== "second_half"}
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[9px]"
                    onClick={onFullTime}
                  >
                    FT
                  </Button>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                    Review
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {STATS_REVIEW_CHIPS.map(({ mode, label }) => (
                      <button
                        key={mode}
                        type="button"
                        className={reviewChipClass(reviewMode === mode)}
                        onClick={() => onSetReviewMode(mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {!isStatsLive ? (
                  <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Spatial review
                    </p>
                    <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                      {PITCH_VIEW_FILTER_CHIPS.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          className={reviewChipClass(pitchMarkerViewFilter === id)}
                          onClick={() => onSetPitchMarkerViewFilter(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1 border-t border-white/10 pt-1.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                    Players ({statsPlayers.length}/15)
                  </p>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {statsPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[9px] text-stone-100/90"
                      >
                        <span className="mr-1 font-bold text-stone-200/80">#{p.number}</span>
                        {p.name}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      value={playerNumberDraft}
                      onChange={(e) => onSetPlayerNumberDraft(e.target.value)}
                      placeholder="#"
                      className="min-w-0 w-12 rounded border border-white/15 bg-black/30 px-2 py-1 text-[10px] text-stone-100 outline-none focus:border-white/30"
                    />
                    <input
                      value={playerNameDraft}
                      onChange={(e) => onSetPlayerNameDraft(e.target.value)}
                      placeholder="Player name"
                      className="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-2 py-1 text-[10px] text-stone-100 outline-none focus:border-white/30"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                      disabled={statsPlayers.length >= 15}
                      onClick={onAddStatsPlayer}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {surfaceMode === "STATS" && openPanel === "voice" ? (
        <section
          className="pointer-events-auto absolute left-[max(0.45rem,env(safe-area-inset-left))] top-1/2 z-50 max-h-[min(75dvh,30rem)] w-[min(15rem,calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-2.2rem))] -translate-y-1/2 overflow-y-auto rounded-[16px] border border-white/20 bg-[rgba(20,26,38,0.9)] p-2.5 shadow-[0_18px_42px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md"
          style={{ marginLeft: "5.2rem" }}
          aria-label="Mobile voice controls"
        >
          <StatsVoiceStrip
            allowRecording={canStatsPitchLog}
            isRecording={isVoiceRecording}
            recordError={voiceError}
            onStartRecord={onStartVoice}
            onStopRecord={onStopVoice}
            pendingVoiceId={pendingVoiceId}
            canAttachToLastEvent={canAttachToLastEvent}
            onAttachToLastEvent={onAttachVoiceToLastEvent}
            onAttachAsMoment={onAttachVoiceAsMoment}
            onDiscardPending={onDiscardPendingVoice}
            voiceMomentIds={voiceMomentIds}
            eventsWithVoice={eventsWithVoice}
            onPlay={onPlayVoice}
          />
        </section>
      ) : null}

      {surfaceMode === "STATS" && openPanel === "log" ? (
        <section
          className="pointer-events-auto absolute right-[max(0.45rem,env(safe-area-inset-right))] top-1/2 z-50 max-h-[min(80dvh,34rem)] w-[min(17rem,calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1.8rem))] -translate-y-1/2 overflow-y-auto rounded-[16px] border border-white/20 bg-[rgba(20,26,38,0.9)] p-2.5 shadow-[0_18px_42px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md"
          aria-label="Mobile log controls"
        >
          <div
            className={cn(
              "space-y-2",
              logPanelDisabled && "pointer-events-none opacity-45",
            )}
          >
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                Field
              </p>
              <div className="grid grid-cols-2 gap-1">
                {STATS_V1_FIELD_KINDS.map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                    aria-pressed={statsArm === k}
                    onClick={() => onArmKind(k)}
                  >
                    {kindUiLabel(k)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                Score
              </p>
              <div className="grid grid-cols-3 gap-1">
                {STATS_V1_SCORE_KINDS.map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                    aria-pressed={statsArm === k}
                    onClick={() => onArmKind(k)}
                  >
                    {kindUiLabel(k)}
                  </Button>
                ))}
              </div>
            </div>

            <StatsScorerStrip
              players={statsPlayers}
              pendingLabel={pendingScoreLabel}
              activeScorerId={activeScorerId}
              onSetActiveScorer={onSetActiveScorer}
            />

            <div className="grid grid-cols-3 gap-1">
              <Button
                type="button"
                variant="secondary"
                className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                onClick={() => onClearArm()}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={statsEventsCount === 0}
                className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                onClick={() => onUndoLastEvent()}
              >
                Undo
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={statsEventsCount === 0}
                className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-2 py-1 text-[10px]"
                onClick={() => onResetEvents()}
              >
                Reset
              </Button>
            </div>

            <p className="text-[9px] tabular-nums text-stone-300/65">Logged: {statsEventsCount}</p>
            {statsPersistError ? (
              <p className="rounded border border-red-500/35 bg-red-950/40 px-2 py-1 text-[9px] text-red-100/95">
                Save failed: {statsPersistError}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
