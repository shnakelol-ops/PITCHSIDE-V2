"use client";

import { Button } from "@/components/ui/button";
import { StatsScorerStrip } from "@src/features/stats/controls/stats-scorer-strip";
import { StatsVoiceStrip } from "@src/features/stats/controls/stats-voice-strip";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import type { StatsV1EventKind } from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

export type PitchMarkerViewFilter = "all" | StatsV1EventKind;

export type StatsReviewChip = {
  mode: StatsReviewMode;
  label: string;
};

export type StatsPitchFilterChip = {
  id: PitchMarkerViewFilter;
  label: string;
};

export type StatsFloatingControlsContentProps = {
  matchPhase: string;
  matchClockRunning: boolean;
  statsPersistError: string | null;
  reviewMode: StatsReviewMode;
  reviewChips: readonly StatsReviewChip[];
  onSetReviewMode: (mode: StatsReviewMode) => void;
  isStatsLive: boolean;
  pitchViewFilterChips: readonly StatsPitchFilterChip[];
  pitchMarkerViewFilter: PitchMarkerViewFilter;
  onSetPitchMarkerViewFilter: (id: PitchMarkerViewFilter) => void;
  canStatsPitchLog: boolean;
  statsArm: StatsV1EventKind | null;
  onArmKind: (kind: StatsV1EventKind) => void;
  fieldKinds: readonly StatsV1EventKind[];
  scoreKinds: readonly StatsV1EventKind[];
  kindUiLabel: (kind: string) => string;
  players: readonly StatsRosterPlayer[];
  pendingScoreLabel: string | null;
  activeScorerId: string | null;
  onSetActiveScorer: (playerId: string | null) => void;
  playerNameDraft: string;
  playerNumberDraft: string;
  onPlayerNameDraftChange: (value: string) => void;
  onPlayerNumberDraftChange: (value: string) => void;
  onAddStatsPlayer: () => void;
  recorderIsRecording: boolean;
  voiceError: string | null;
  onStartVoice: () => void;
  onStopVoice: () => void;
  pendingVoiceId: string | null;
  canAttachToLastEvent: boolean;
  onAttachVoiceToLastEvent: () => void;
  onAttachVoiceAsMoment: () => void;
  onDiscardPendingVoice: () => void;
  voiceMomentIds: readonly string[];
  eventsWithVoice: readonly StatsLoggedEvent[];
  onPlayVoiceNote: (voiceNoteId: string) => void;
  onClearArm: () => void;
  onUndoLastEvent: () => void;
  onResetEvents: () => void;
  totalEventsCount: number;
  reviewWindowEventsCount: number;
};

function reviewChipClass(active: boolean): string {
  return cn(
    "inline-flex min-h-[1.5rem] items-center justify-center rounded-[6px] border px-1 py-0.5 text-[7.5px] font-bold uppercase tracking-wide transition",
    active
      ? "border-amber-300/55 bg-[rgba(98,80,46,0.72)] text-amber-50 shadow-[0_0_0_1px_rgba(245,207,120,0.18)]"
      : "border-white/15 bg-[rgba(34,38,48,0.82)] text-stone-100 hover:border-white/25 hover:bg-[rgba(56,66,92,0.82)]",
  );
}

function formatMatchPhaseLabel(phase: string): string {
  return phase.replace(/_/g, " ");
}

export function StatsFloatingControlsContent({
  matchPhase,
  matchClockRunning,
  statsPersistError,
  reviewMode,
  reviewChips,
  onSetReviewMode,
  isStatsLive,
  pitchViewFilterChips,
  pitchMarkerViewFilter,
  onSetPitchMarkerViewFilter,
  canStatsPitchLog,
  statsArm,
  onArmKind,
  fieldKinds,
  scoreKinds,
  kindUiLabel,
  players,
  pendingScoreLabel,
  activeScorerId,
  onSetActiveScorer,
  playerNameDraft,
  playerNumberDraft,
  onPlayerNameDraftChange,
  onPlayerNumberDraftChange,
  onAddStatsPlayer,
  recorderIsRecording,
  voiceError,
  onStartVoice,
  onStopVoice,
  pendingVoiceId,
  canAttachToLastEvent,
  onAttachVoiceToLastEvent,
  onAttachVoiceAsMoment,
  onDiscardPendingVoice,
  voiceMomentIds,
  eventsWithVoice,
  onPlayVoiceNote,
  onClearArm,
  onUndoLastEvent,
  onResetEvents,
  totalEventsCount,
  reviewWindowEventsCount,
}: StatsFloatingControlsContentProps) {
  return (
    <div className="space-y-0.5">
      <div className="rounded-lg border border-white/10 bg-black/20 px-1.5 py-[3px] text-[8.5px] text-stone-200/80">
        {formatMatchPhaseLabel(matchPhase)} · {matchClockRunning ? "running" : "stopped"}
      </div>

      <div className="space-y-0.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
          Review
        </p>
        <div className="grid grid-cols-3 gap-px">
          {reviewChips.map(({ mode, label }) => (
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
        <div className="space-y-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
            Spatial review
          </p>
          <div className="flex max-h-24 flex-wrap gap-px overflow-y-auto">
            {pitchViewFilterChips.map(({ id, label }) => (
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

      <div
        className={cn(
          "space-y-0.5",
          !canStatsPitchLog && "pointer-events-none opacity-45",
        )}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
          Field
        </p>
        <div className="grid grid-cols-2 gap-px">
          {fieldKinds.map((k) => (
            <Button
              key={k}
              type="button"
              variant="secondary"
              className="pointer-events-auto min-h-[1.6rem] rounded-lg px-1 py-0.5 text-[8.5px]"
              aria-pressed={statsArm === k}
              onClick={() => onArmKind(k)}
            >
              {kindUiLabel(k)}
            </Button>
          ))}
        </div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
          Score
        </p>
        <div className="grid grid-cols-3 gap-px">
          {scoreKinds.map((k) => (
            <Button
              key={k}
              type="button"
              variant="secondary"
              className="pointer-events-auto min-h-[1.6rem] rounded-lg px-1 py-0.5 text-[8.5px]"
              aria-pressed={statsArm === k}
              onClick={() => onArmKind(k)}
            >
              {kindUiLabel(k)}
            </Button>
          ))}
        </div>
      </div>

      <StatsScorerStrip
        players={players}
        pendingLabel={pendingScoreLabel}
        activeScorerId={activeScorerId}
        onSetActiveScorer={onSetActiveScorer}
      />

      <div className="space-y-0.5 border-t border-white/10 pt-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
          Players ({players.length}/15)
        </p>
        <div className="flex gap-px overflow-x-auto pb-0.5">
          {players.map((p) => (
            <div
              key={p.id}
              className="shrink-0 rounded-md border border-white/15 bg-white/5 px-1 py-0.5 text-[8.5px] text-stone-100/90"
            >
              <span className="mr-1 font-bold text-stone-200/80">#{p.number}</span>
              {p.name}
            </div>
          ))}
        </div>
        <div className="flex gap-px">
          <input
            value={playerNumberDraft}
            onChange={(e) => onPlayerNumberDraftChange(e.target.value)}
            placeholder="#"
            className="min-w-0 w-11 rounded border border-white/15 bg-black/30 px-1 py-0.5 text-[8.5px] text-stone-100 outline-none focus:border-white/30"
          />
          <input
            value={playerNameDraft}
            onChange={(e) => onPlayerNameDraftChange(e.target.value)}
            placeholder="Player name"
            className="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-1 py-0.5 text-[8.5px] text-stone-100 outline-none focus:border-white/30"
          />
          <Button
            type="button"
            variant="secondary"
            className="min-h-[1.6rem] rounded-lg px-1 py-0.5 text-[8.5px]"
            disabled={players.length >= 15}
            onClick={onAddStatsPlayer}
          >
            Add
          </Button>
        </div>
      </div>

      <StatsVoiceStrip
        allowRecording={canStatsPitchLog}
        isRecording={recorderIsRecording}
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
        onPlay={onPlayVoiceNote}
      />

      <div className="grid grid-cols-3 gap-px">
        <Button
          type="button"
          variant="secondary"
          className="min-h-[1.6rem] rounded-lg px-1 py-0.5 text-[8.5px]"
          disabled={!canStatsPitchLog}
          onClick={onClearArm}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[1.6rem] rounded-lg px-1 py-0.5 text-[8.5px]"
          disabled={!canStatsPitchLog || totalEventsCount === 0}
          onClick={onUndoLastEvent}
        >
          Undo
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[1.6rem] rounded-lg px-1 py-0.5 text-[8.5px]"
          disabled={totalEventsCount === 0}
          onClick={onResetEvents}
        >
          Reset
        </Button>
      </div>

      <p className="text-[8.5px] tabular-nums text-stone-300/65">
        Logged: {reviewWindowEventsCount}
      </p>
      {statsPersistError ? (
        <p className="rounded border border-red-500/35 bg-red-950/40 px-2 py-1 text-[9px] text-red-100/95">
          Save failed: {statsPersistError}
        </p>
      ) : null}
    </div>
  );
}
