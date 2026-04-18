"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatsRecentEventsCard } from "@src/features/stats/controls/stats-recent-events-card";
import { StatsScorerStrip } from "@src/features/stats/controls/stats-scorer-strip";
import { StatsVoiceStrip } from "@src/features/stats/controls/stats-voice-strip";
import { StatsVoiceReviewCard } from "@src/features/stats/controls/stats-voice-review-card";
import type {
  StatsVoiceMoment,
  StatsVoicePlaybackError,
} from "@src/features/stats/hooks/use-stats-event-log";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import {
  STATS_V1_EVENT_KINDS,
  type StatsV1EventKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsRosterPlayer } from "@src/features/stats/types/stats-roster";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

const BTN_BASE =
  "min-h-8 justify-center rounded-[9px] px-2.5 py-1.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)] transition disabled:cursor-not-allowed disabled:opacity-45";
const BTN_IDLE =
  "!border !border-white/[0.08] !bg-white/[0.02] !text-slate-200/90 hover:!border-white/[0.16] hover:!bg-white/[0.06]";
const BTN_AMBER =
  "!border !border-amber-400/24 !bg-[rgba(48,36,18,0.88)] !text-[rgba(254,243,199,0.96)] hover:!border-amber-300/34 hover:!bg-[rgba(54,40,20,0.92)]";

const KIND_LABEL: Record<StatsV1EventKind, string> = {
  GOAL: "Goal",
  POINT: "Point",
  TWO_POINT: "2PT",
  WIDE: "Wide",
  TURNOVER_WON: "T. Won",
  TURNOVER_LOST: "T. Lost",
  KICKOUT_WON: "KO Won",
  KICKOUT_LOST: "KO Lost",
  FREE_WON: "F. Won",
  FREE_CONCEDED: "F. Lost",
  SHOT: "Shot",
};

function RailSection({
  title,
  children,
  right,
  collapsible,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className="relative flex flex-col overflow-hidden rounded-[12px] border border-white/[0.06] backdrop-blur-[6px]"
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
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-2">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-1.5">
          {right}
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
              className="inline-flex size-6 items-center justify-center rounded-md text-slate-400/70 transition-colors hover:bg-white/[0.04] hover:text-slate-200"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  open ? "rotate-0" : "-rotate-90",
                )}
                strokeWidth={2}
              />
            </button>
          ) : null}
        </div>
      </div>
      {(!collapsible || open) && (
        <div className="px-3 py-2.5">{children}</div>
      )}
    </section>
  );
}

export type StatsRightRailProps = {
  // Scorer
  players: readonly StatsRosterPlayer[];
  activeScorerId: string | null;
  pendingScoreLabel: string | null;
  onSetActiveScorer: (playerId: string | null) => void;

  // Voice
  voiceIsRecording: boolean;
  voiceError: string | null;
  pendingVoiceId: string | null;
  canAttachVoiceToLastEvent: boolean;
  canRecordVoice: boolean;
  voiceMoments: readonly StatsVoiceMoment[];
  eventsWithVoice: readonly StatsLoggedEvent[];
  voicePlaybackError: StatsVoicePlaybackError | null;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onAttachVoiceToLastEvent: () => void;
  onAttachVoiceAsMoment: () => void;
  onDiscardPendingVoice: () => void;
  onPlayVoice: (voiceNoteId: string) => void;

  // Recent events
  statsEvents: readonly StatsLoggedEvent[];

  // Review tools (secondary — below live workflow)
  reviewMode: StatsReviewMode;
  pitchMarkerViewFilter: "all" | StatsV1EventKind;
  onSetPitchMarkerViewFilter: (filter: "all" | StatsV1EventKind) => void;
  canUndo: boolean;
  onUndoLast: () => void;
  canClearArm: boolean;
  onClearArm: () => void;
  canResetEvents: boolean;
  onResetEvents: () => void;
  lastStatsEvent: StatsLoggedEvent | undefined;
};

/**
 * Live coach workflow rail (~312px).
 *
 * Order (fixed):
 *   1. Active Scorer
 *   2. Voice Notes
 *   3. Recent Events
 *   4. Review Tools (collapsible, secondary)
 */
export function StatsRightRail({
  players,
  activeScorerId,
  pendingScoreLabel,
  onSetActiveScorer,
  voiceIsRecording,
  voiceError,
  pendingVoiceId,
  canAttachVoiceToLastEvent,
  canRecordVoice,
  voiceMoments,
  eventsWithVoice,
  voicePlaybackError,
  onStartVoice,
  onStopVoice,
  onAttachVoiceToLastEvent,
  onAttachVoiceAsMoment,
  onDiscardPendingVoice,
  onPlayVoice,
  statsEvents,
  reviewMode,
  pitchMarkerViewFilter,
  onSetPitchMarkerViewFilter,
  canUndo,
  onUndoLast,
  canClearArm,
  onClearArm,
  canResetEvents,
  onResetEvents,
}: StatsRightRailProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const isLive = reviewMode === "live";

  // Trace wrapper: logs then forwards. New identity each render is fine —
  // StatsVoiceStrip / StatsVoiceReviewCard aren't memoized.
  const onPlayVoiceTraced = (voiceNoteId: string) => {
    console.log("PLAY PIPE right-rail", voiceNoteId);
    onPlayVoice(voiceNoteId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      {/* 1. Active Scorer */}
      <RailSection title="Active Scorer">
        <StatsScorerStrip
          players={players}
          pendingLabel={pendingScoreLabel}
          activeScorerId={activeScorerId}
          onSetActiveScorer={onSetActiveScorer}
        />
      </RailSection>

      {/* 2. Voice Notes */}
      <RailSection title="Voice Notes">
        <StatsVoiceStrip
          allowRecording={canRecordVoice}
          isRecording={voiceIsRecording}
          recordError={voiceError}
          onStartRecord={onStartVoice}
          onStopRecord={onStopVoice}
          pendingVoiceId={pendingVoiceId}
          canAttachToLastEvent={canAttachVoiceToLastEvent}
          onAttachToLastEvent={onAttachVoiceToLastEvent}
          onAttachAsMoment={onAttachVoiceAsMoment}
          onDiscardPending={onDiscardPendingVoice}
          voiceMoments={voiceMoments}
          eventsWithVoice={eventsWithVoice}
          playbackError={voicePlaybackError}
          onPlay={onPlayVoiceTraced}
        />
      </RailSection>

      {/* 3. Recent Events */}
      <StatsRecentEventsCard events={statsEvents} players={players} />

      {/* 3b. Voice Clips — review-only (HT / FT). Compact, secondary. */}
      {!isLive ? (
        <StatsVoiceReviewCard
          reviewMode={reviewMode}
          voiceMoments={voiceMoments}
          eventsWithVoice={eventsWithVoice}
          playbackError={voicePlaybackError}
          onPlay={onPlayVoiceTraced}
        />
      ) : null}

      {/* 4. Review Tools (secondary, collapsible) */}
      <RailSection
        title="Review Tools"
        collapsible
        defaultOpen={false}
        right={
          <span className="rounded-full border border-white/[0.06] bg-black/25 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-slate-400/70">
            {statsEvents.length}
          </span>
        }
      >
        <div className="flex flex-col gap-2.5">
          {!isLive ? (
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400/70">
                Pitch marker filter
              </p>
              <div
                className="flex max-h-28 flex-wrap gap-1 overflow-y-auto pr-0.5"
                role="group"
                aria-label="Pitch marker filter"
              >
                <button
                  type="button"
                  className={cn(
                    BTN_BASE,
                    "flex-1",
                    pitchMarkerViewFilter === "all" ? BTN_AMBER : BTN_IDLE,
                  )}
                  onClick={() => onSetPitchMarkerViewFilter("all")}
                >
                  All
                </button>
                {STATS_V1_EVENT_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={cn(
                      BTN_BASE,
                      pitchMarkerViewFilter === k ? BTN_AMBER : BTN_IDLE,
                    )}
                    onClick={() => onSetPitchMarkerViewFilter(k)}
                  >
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Log actions">
            <Button
              type="button"
              variant="secondary"
              disabled={!canClearArm}
              className={cn(BTN_BASE, "flex-1", BTN_IDLE)}
              onClick={onClearArm}
            >
              Clear arm
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canUndo}
              className={cn(BTN_BASE, "flex-1", BTN_IDLE)}
              onClick={onUndoLast}
            >
              Undo last
            </Button>
          </div>

          {confirmClear ? (
            <div className="rounded-[10px] border border-amber-400/22 bg-amber-950/30 px-2.5 py-2">
              <p className="mb-1.5 text-[10px] font-medium text-amber-100/92">
                Clear all events?
              </p>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(BTN_BASE, "flex-1", BTN_IDLE)}
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(BTN_BASE, "flex-1", BTN_AMBER)}
                  onClick={() => {
                    onResetEvents();
                    setConfirmClear(false);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={!canResetEvents}
              className={cn(BTN_BASE, "w-full", BTN_IDLE)}
              onClick={() => setConfirmClear(true)}
            >
              Clear log
            </Button>
          )}
        </div>
      </RailSection>
    </div>
  );
}
