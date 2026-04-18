"use client";

import { useMemo } from "react";
import { Play } from "lucide-react";

import type { StatsVoiceMoment } from "@src/features/stats/hooks/use-stats-event-log";
import type {
  StatsLoggedEvent,
  StatsPeriodPhase,
} from "@src/features/stats/model/stats-logged-event";
import type { StatsV1EventKind } from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { cn } from "@pitchside/utils";

export type StatsVoiceReviewCardProps = {
  reviewMode: StatsReviewMode;
  voiceMoments: readonly StatsVoiceMoment[];
  /** Events that carry an attached voice clip. */
  eventsWithVoice: readonly StatsLoggedEvent[];
  onPlay: (voiceNoteId: string) => void;
};

type Row = {
  kind: "moment" | "event";
  voiceNoteId: string;
  timestampMs: number;
  periodPhase: StatsPeriodPhase;
  /** Short event-kind label for event-attached clips (null for free moments). */
  eventLabel: string | null;
};

/** Compact label map reused from other rails. Kept local to avoid cross-deps. */
const EVENT_KIND_LABEL: Record<StatsV1EventKind, string> = {
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

function phaseBadge(phase: StatsPeriodPhase): string {
  switch (phase) {
    case "first_half":
      return "1H";
    case "half_time":
      return "HT";
    case "second_half":
      return "2H";
    case "full_time":
      return "FT";
    case "extra_time":
      return "ET";
    default:
      return "—";
  }
}

/** Simple wall-clock HH:MM — one time system, no match-seconds math. */
function formatHmm(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function isPhaseVisibleInReview(
  phase: StatsPeriodPhase,
  reviewMode: StatsReviewMode,
): boolean {
  if (reviewMode === "halftime") {
    // Halftime review: show 1st-half play + HT captures.
    return phase === "first_half" || phase === "half_time";
  }
  // Full-time review: show everything (all match phases).
  return true;
}

/**
 * Compact voice-clip review card. Rendered only outside live mode.
 * Lists relevant moments + event-attached clips, newest first, with one-tap play.
 * Intentionally small: capped row count, single-scroll, no dashboard behaviour.
 */
export function StatsVoiceReviewCard({
  reviewMode,
  voiceMoments,
  eventsWithVoice,
  onPlay,
}: StatsVoiceReviewCardProps) {
  const rows = useMemo<Row[]>(() => {
    const momentRows: Row[] = voiceMoments
      .filter((m) => isPhaseVisibleInReview(m.periodPhase, reviewMode))
      .map((m) => ({
        kind: "moment",
        voiceNoteId: m.id,
        timestampMs: m.timestampMs,
        periodPhase: m.periodPhase,
        eventLabel: null,
      }));

    const eventRows: Row[] = eventsWithVoice
      .filter(
        (e) =>
          e.voiceNoteId != null &&
          isPhaseVisibleInReview(e.periodPhase, reviewMode),
      )
      .map((e) => ({
        kind: "event",
        voiceNoteId: e.voiceNoteId as string,
        timestampMs: e.timestampMs,
        periodPhase: e.periodPhase,
        eventLabel: EVENT_KIND_LABEL[e.kind] ?? e.kind,
      }));

    // Newest first; cap at 8 rows to stay compact and secondary to pitch.
    return [...momentRows, ...eventRows]
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 8);
  }, [voiceMoments, eventsWithVoice, reviewMode]);

  return (
    <section
      className="relative flex flex-col overflow-hidden rounded-[12px] border border-white/[0.06] backdrop-blur-[6px]"
      style={{
        backgroundColor: "rgba(14,17,22,0.72)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 28px -16px rgba(0,0,0,0.55)",
      }}
      aria-label="Voice clips review"
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
            Voice Clips
          </div>
        </div>
        <span className="rounded-full border border-white/[0.06] bg-black/25 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-slate-400/70">
          {rows.length}
        </span>
      </div>

      <div className="px-3 py-2">
        {rows.length === 0 ? (
          <p className="text-[10px] leading-snug text-slate-400/70">
            No voice clips for this review window.
          </p>
        ) : (
          <ul className="flex flex-col gap-1" role="list">
            {rows.map((r) => (
              <li key={`${r.kind}:${r.voiceNoteId}`}>
                <button
                  type="button"
                  onClick={() => onPlay(r.voiceNoteId)}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-[8px] border border-white/[0.06] bg-white/[0.015] px-2 py-1.5 text-left transition-colors",
                    "hover:border-white/[0.14] hover:bg-white/[0.05]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,167,255,0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F12]",
                  )}
                  aria-label={`Play voice clip at ${formatHmm(r.timestampMs)}`}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                      r.kind === "event"
                        ? "bg-[rgba(90,167,255,0.14)] text-[rgba(188,214,246,0.98)]"
                        : "bg-[rgba(167,139,250,0.14)] text-violet-100/95",
                    )}
                  >
                    <Play className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="inline-flex h-4 min-w-[1.5rem] shrink-0 items-center justify-center rounded-[4px] border border-white/[0.08] bg-black/30 px-1 text-[8.5px] font-bold uppercase tracking-[0.12em] text-slate-300/85">
                      {phaseBadge(r.periodPhase)}
                    </span>
                    <span className="truncate text-[10.5px] font-semibold text-slate-100/95">
                      {r.eventLabel ?? "Moment"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-400/85">
                    {formatHmm(r.timestampMs)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
