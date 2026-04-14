"use client";

import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import { cn } from "@pitchside/utils";

function eventShortLabel(e: StatsLoggedEvent): string {
  return e.kind.replace(/_/g, " ").toLowerCase().slice(0, 12);
}

export type StatsVoiceStripProps = {
  /** When false, record/stop hidden (e.g. HT/FT review); playback chips still work. */
  allowRecording?: boolean;
  isRecording: boolean;
  recordError: string | null;
  onStartRecord: () => void;
  onStopRecord: () => void;
  pendingVoiceId: string | null;
  canAttachToLastEvent: boolean;
  onAttachToLastEvent: () => void;
  onAttachAsMoment: () => void;
  onDiscardPending: () => void;
  voiceMomentIds: readonly string[];
  eventsWithVoice: readonly StatsLoggedEvent[];
  onPlay: (voiceNoteId: string) => void;
};

/**
 * Tight voice UI: record/stop, attach to last event or moment, play clips from memory.
 */
export function StatsVoiceStrip({
  allowRecording = true,
  isRecording,
  recordError,
  onStartRecord,
  onStopRecord,
  pendingVoiceId,
  canAttachToLastEvent,
  onAttachToLastEvent,
  onAttachAsMoment,
  onDiscardPending,
  voiceMomentIds,
  eventsWithVoice,
  onPlay,
}: StatsVoiceStripProps) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-200/70">
          Voice
        </span>
        {allowRecording ? (
          !isRecording ? (
            <button
              type="button"
              className="rounded-md border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-[9px] font-bold uppercase text-rose-100/95 hover:bg-rose-500/25"
              onClick={onStartRecord}
            >
              Record
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md border border-emerald-400/50 bg-emerald-600/25 px-2 py-1 text-[9px] font-bold uppercase text-emerald-50 animate-pulse"
              onClick={onStopRecord}
            >
              Stop
            </button>
          )
        ) : (
          <span className="text-[8px] text-emerald-100/45">Live only</span>
        )}
      </div>
      {recordError ? (
        <p className="text-[9px] text-rose-300/90" role="alert">
          {recordError}
        </p>
      ) : null}
      {pendingVoiceId ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-emerald-100/70">Clip ready —</span>
          <button
            type="button"
            disabled={!canAttachToLastEvent}
            className={cn(
              "rounded border px-2 py-0.5 text-[9px] font-semibold uppercase",
              canAttachToLastEvent
                ? "border-white/20 text-emerald-100/90 hover:bg-white/10"
                : "cursor-not-allowed border-white/10 text-emerald-100/35",
            )}
            onClick={onAttachToLastEvent}
          >
            Last event
          </button>
          <button
            type="button"
            className="rounded border border-white/20 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-100/90 hover:bg-white/10"
            onClick={onAttachAsMoment}
          >
            Moment
          </button>
          <button
            type="button"
            className="rounded border border-white/15 px-2 py-0.5 text-[8px] font-semibold uppercase text-amber-200/80 hover:bg-white/10"
            onClick={onDiscardPending}
          >
            Drop
          </button>
        </div>
      ) : null}
      {voiceMomentIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[8px] font-semibold uppercase text-emerald-100/50">Moments</span>
          {voiceMomentIds.map((id) => (
            <button
              key={id}
              type="button"
              className="rounded border border-violet-400/35 bg-violet-500/10 px-2 py-0.5 text-[8px] font-semibold text-violet-100/90 hover:bg-violet-500/20"
              title={id}
              onClick={() => onPlay(id)}
            >
              ▶ {id.slice(0, 6)}
            </button>
          ))}
        </div>
      ) : null}
      {eventsWithVoice.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[8px] font-semibold uppercase text-emerald-100/50">On events</span>
          {eventsWithVoice.map((e) => (
            <button
              key={e.id}
              type="button"
              className="max-w-[6.5rem] truncate rounded border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[8px] font-semibold text-sky-100/90 hover:bg-sky-500/20"
              title={e.id}
              onClick={() => e.voiceNoteId && onPlay(e.voiceNoteId)}
            >
              ▶ {eventShortLabel(e)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
