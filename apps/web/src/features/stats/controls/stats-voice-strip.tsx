"use client";

import { useEffect, useState } from "react";

import type {
  StatsVoiceMoment,
  StatsVoicePlaybackError,
} from "@src/features/stats/hooks/use-stats-event-log";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import { cn } from "@pitchside/utils";

/** Proof-of-wiring log fired from every play click. Kept terse so field
 *  logs stay readable. Matches the debug contract used across the chain. */
function logVoiceTap(id: string, source: "moment" | "event") {
  console.log("PLAY CLICK", source, id);
}

function eventShortLabel(e: StatsLoggedEvent): string {
  return e.kind.replace(/_/g, " ").toLowerCase().slice(0, 12);
}

/** Simple wall-clock HH:MM — consistent across live + review. */
function formatHmm(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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
  voiceMoments: readonly StatsVoiceMoment[];
  eventsWithVoice: readonly StatsLoggedEvent[];
  /** Most recent playback failure (auto-clears). Used to flag the failing clip. */
  playbackError?: StatsVoicePlaybackError | null;
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
  voiceMoments,
  eventsWithVoice,
  playbackError = null,
  onPlay,
}: StatsVoiceStripProps) {
  const [tab, setTab] = useState<"record" | "playback">(
    allowRecording ? "record" : "playback",
  );

  useEffect(() => {
    if (!allowRecording && tab === "record") {
      setTab("playback");
    }
  }, [allowRecording, tab]);

  return (
    <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-200/70">
          Voice notes
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!allowRecording}
            className={cn(
              "rounded border px-2 py-0.5 text-[8px] font-semibold uppercase",
              tab === "record"
                ? "border-emerald-300/60 bg-emerald-500/20 text-emerald-50"
                : "border-white/15 bg-white/5 text-emerald-100/80 hover:bg-white/10",
              !allowRecording && "cursor-not-allowed opacity-45",
            )}
            onClick={() => setTab("record")}
          >
            Record
          </button>
          <button
            type="button"
            className={cn(
              "rounded border px-2 py-0.5 text-[8px] font-semibold uppercase",
              tab === "playback"
                ? "border-sky-300/60 bg-sky-500/20 text-sky-50"
                : "border-white/15 bg-white/5 text-emerald-100/80 hover:bg-white/10",
            )}
            onClick={() => setTab("playback")}
          >
            Playback
          </button>
        </div>
      </div>
      {tab === "record" ? (
        <>
          <div className="flex flex-wrap items-center gap-1">
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
              <span className="text-[8px] text-emerald-100/45">
                Match over — recording locked
              </span>
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
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          {voiceMoments.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[8px] font-semibold uppercase text-emerald-100/50">
                Moments
              </span>
              {voiceMoments.map((m) => {
                const failed = playbackError?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-semibold",
                      failed
                        ? "border-rose-400/50 bg-rose-500/15 text-rose-100/95 hover:bg-rose-500/25"
                        : "border-violet-400/35 bg-violet-500/10 text-violet-100/95 hover:bg-violet-500/20",
                    )}
                    title={failed ? playbackError?.reason ?? m.id : m.id}
                    onClick={() => {
                      logVoiceTap(m.id, "moment");
                      onPlay(m.id);
                    }}
                  >
                    <span aria-hidden>{failed ? "⚠" : "▶"}</span>
                    <span className="font-mono tabular-nums">
                      {formatHmm(m.timestampMs)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {eventsWithVoice.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[8px] font-semibold uppercase text-emerald-100/50">
                On events
              </span>
              {eventsWithVoice.map((e) => {
                const vid = e.voiceNoteId;
                const failed = vid != null && playbackError?.id === vid;
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={cn(
                      "inline-flex max-w-[9rem] items-center gap-1 truncate rounded border px-2 py-0.5 text-[9px] font-semibold",
                      failed
                        ? "border-rose-400/50 bg-rose-500/15 text-rose-100/95 hover:bg-rose-500/25"
                        : "border-sky-400/35 bg-sky-500/10 text-sky-100/95 hover:bg-sky-500/20",
                    )}
                    title={failed ? playbackError?.reason ?? e.id : e.id}
                    onClick={() => {
                      if (!vid) return;
                      logVoiceTap(vid, "event");
                      onPlay(vid);
                    }}
                  >
                    <span aria-hidden>{failed ? "⚠" : "▶"}</span>
                    <span className="truncate">{eventShortLabel(e)}</span>
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        failed ? "text-rose-100/75" : "text-sky-100/70",
                      )}
                    >
                      {formatHmm(e.timestampMs)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {voiceMoments.length === 0 && eventsWithVoice.length === 0 ? (
            <p className="text-[9px] leading-snug text-emerald-100/55">
              No voice notes yet. Record a clip to build up review material.
            </p>
          ) : null}
          {playbackError ? (
            <p
              role="alert"
              className="text-[9px] leading-snug text-rose-200/90"
            >
              Playback failed — unsupported format or empty clip
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
