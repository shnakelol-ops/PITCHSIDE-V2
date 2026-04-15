"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PitchSport } from "@/config/pitchConfig";
import {
  downloadPitchCanvasPng,
  shareOrDownloadPitchPng,
} from "@/lib/pitch-canvas-export";
import {
  SimulatorPixiSurface,
  type SimulatorPixiSurfaceHandle,
  type SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
import { useStatsEventLog } from "@src/features/stats/hooks/use-stats-event-log";
import { useStatsVoiceRecorder } from "@src/features/stats/hooks/use-stats-voice-recorder";
import type { StatsV1EventKind } from "@src/features/stats/model/stats-v1-event-kind";

/** Same heuristic as `POST /api/events` `matchId` (CUID). */
const PITCH_OPTIONS: { id: PitchSport; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic" },
  { id: "hurling", label: "Hurling" },
];

const STATS_PRIMARY_EVENT_KINDS: readonly StatsV1EventKind[] = [
  "GOAL",
  "POINT",
  "TWO_POINT",
  "SHOT",
  "WIDE",
];

const STATS_SECONDARY_EVENT_KINDS: readonly StatsV1EventKind[] = [
  "TURNOVER_WON",
  "TURNOVER_LOST",
  "FREE_WON",
  "FREE_CONCEDED",
  "KICKOUT_WON",
  "KICKOUT_LOST",
];

function statsEventLabel(kind: StatsV1EventKind): string {
  return kind.replace(/_/g, " ");
}

export default function SimulatorPageClient() {
  const sp = useSearchParams();
  const mode = sp.get("mode");
  const [surfaceMode, setSurfaceMode] = useState<SimulatorSurfaceMode>(
    mode === "stats" ? "STATS" : "SIMULATOR",
  );
  const [sport, setSport] = useState<PitchSport>("gaelic");
  const [pathRecording, setPathRecording] = useState(false);
  const [shadowRecording, setShadowRecording] = useState(false);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const utilityWrapRef = useRef<HTMLDivElement | null>(null);
  const surfaceHostRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<SimulatorPixiSurfaceHandle>(null);
  const {
    events: statsEvents,
    arm: statsArm,
    reviewMode,
    voiceMomentIds,
    armKind,
    logTap,
    setReviewMode,
    storeVoiceBlob,
    removeVoiceBlob,
    playVoiceNote,
    attachVoiceNoteToEvent,
    addVoiceMoment,
  } = useStatsEventLog();
  const recorder = useStatsVoiceRecorder();
  const [pendingVoiceId, setPendingVoiceId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [pitchExportError, setPitchExportError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("simulator-route");
    document.body.classList.add("simulator-route");
    return () => {
      document.documentElement.classList.remove("simulator-route");
      document.body.classList.remove("simulator-route");
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!utilityOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (utilityWrapRef.current?.contains(target)) return;
      setUtilityOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [utilityOpen]);

  const statsEventsWithVoice = useMemo(
    () =>
      statsEvents
        .filter((event) => event.voiceNoteId != null && event.voiceNoteId.length > 0)
        .slice(-4),
    [statsEvents],
  );
  const lastStatsEvent =
    statsEvents.length > 0 ? statsEvents[statsEvents.length - 1] : undefined;
  const canStatsVoiceRecord = reviewMode === "live";

  useEffect(() => {
    if (surfaceMode === "STATS") {
      if (statsArm == null) {
        armKind("SHOT");
      }
      return;
    }
    if (pendingVoiceId) {
      removeVoiceBlob(pendingVoiceId);
      setPendingVoiceId(null);
    }
    setVoiceError(null);
  }, [armKind, pendingVoiceId, removeVoiceBlob, statsArm, surfaceMode]);

  const onStartVoice = useCallback(async () => {
    setVoiceError(null);
    if (!canStatsVoiceRecord) {
      setVoiceError("Voice capture is available in Live review only.");
      return;
    }
    if (pendingVoiceId) {
      removeVoiceBlob(pendingVoiceId);
      setPendingVoiceId(null);
    }
    await recorder.startRecording();
  }, [canStatsVoiceRecord, pendingVoiceId, recorder, removeVoiceBlob]);

  const onStopVoice = useCallback(async () => {
    setVoiceError(null);
    const blob = await recorder.stopRecording();
    if (!blob || blob.size === 0) {
      setVoiceError("Nothing captured.");
      return;
    }
    const c = globalThis.crypto;
    const id =
      c && "randomUUID" in c && typeof c.randomUUID === "function"
        ? c.randomUUID()
        : `vn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    storeVoiceBlob(id, blob);
    setPendingVoiceId(id);
  }, [recorder, storeVoiceBlob]);

  const onAttachVoiceToLastEvent = useCallback(() => {
    if (!pendingVoiceId || !lastStatsEvent) return;
    attachVoiceNoteToEvent(lastStatsEvent.id, pendingVoiceId);
    setPendingVoiceId(null);
  }, [attachVoiceNoteToEvent, lastStatsEvent, pendingVoiceId]);

  const onAttachVoiceAsMoment = useCallback(() => {
    if (!pendingVoiceId) return;
    addVoiceMoment(pendingVoiceId);
    setPendingVoiceId(null);
  }, [addVoiceMoment, pendingVoiceId]);

  const onDropPendingVoice = useCallback(() => {
    if (!pendingVoiceId) return;
    removeVoiceBlob(pendingVoiceId);
    setPendingVoiceId(null);
    setVoiceError(null);
  }, [pendingVoiceId, removeVoiceBlob]);

  const onExportPitchPng = useCallback(() => {
    setPitchExportError(null);
    void downloadPitchCanvasPng(surfaceHostRef.current, {
      filename: `pitchside-pitch-${Date.now()}.png`,
    }).then((result) => {
      if (!result.ok) setPitchExportError(result.error);
    });
  }, []);

  const onSharePitchPng = useCallback(() => {
    setPitchExportError(null);
    void shareOrDownloadPitchPng(surfaceHostRef.current, {
      filename: `pitchside-pitch-${Date.now()}.png`,
    }).then((result) => {
      if (!result.ok) setPitchExportError(result.error);
    });
  }, []);

  return (
    <div className="simulator-direct relative h-[100dvh] min-h-0 overflow-hidden bg-[#0b0f0c]">
      <div ref={surfaceHostRef} className="absolute inset-0">
        <SimulatorPixiSurface
          ref={surfaceRef}
          sport={sport}
          recordingMode={surfaceMode === "SIMULATOR" ? pathRecording : false}
          shadowRecordingMode={surfaceMode === "SIMULATOR" ? shadowRecording : false}
          surfaceMode={surfaceMode}
          statsArm={surfaceMode === "STATS" ? statsArm : null}
          statsLoggedEvents={surfaceMode === "STATS" ? statsEvents : []}
          onStatsPitchTap={surfaceMode === "STATS" ? logTap : undefined}
          statsReviewMode={reviewMode}
          statsPitchInteractive={surfaceMode === "STATS"}
          className="h-full w-full !max-h-[100dvh] !rounded-md !border-0 !bg-transparent !shadow-none !ring-0"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-30">
        <div className="pointer-events-none absolute bottom-[max(0.6rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2">
          <div className="pointer-events-none flex items-center gap-1 rounded-xl border border-white/15 bg-[rgba(16,18,26,0.74)] px-2 py-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.78)] backdrop-blur-md">
            <Button
              type="button"
              variant="secondary"
              className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
              onClick={() => surfaceRef.current?.play()}
            >
              Play
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
              onClick={() => surfaceRef.current?.pause()}
            >
              Pause
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="pointer-events-auto min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
              onClick={() => surfaceRef.current?.reset()}
            >
              Reset
            </Button>
          </div>
        </div>

        <aside
          ref={utilityWrapRef}
          className="pointer-events-none absolute z-40 flex flex-col items-end"
          style={{
            top: "max(0.75rem, env(safe-area-inset-top))",
            right: "max(0.75rem, env(safe-area-inset-right))",
            bottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            aria-label={utilityOpen ? "Close utility menu" : "Open utility menu"}
            aria-expanded={utilityOpen}
            className={`pointer-events-auto ml-auto inline-flex size-12 items-center justify-center rounded-full border transition duration-150 ${
              utilityOpen
                ? "border-sky-300/65 bg-[rgba(34,66,112,0.88)] text-sky-100 shadow-[0_0_0_1px_rgba(125,211,252,0.45),0_16px_36px_-18px_rgba(56,189,248,0.65)]"
                : "border-sky-300/45 bg-[rgba(28,38,56,0.92)] text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_20px_44px_-22px_rgba(14,165,233,0.55),0_18px_36px_-20px_rgba(0,0,0,0.8)]"
            }`}
            onClick={() => setUtilityOpen((v) => !v)}
          >
            <SlidersHorizontal className="size-5" />
          </button>
          <div
            className={`mt-2 origin-top-right overflow-y-auto rounded-[18px] border border-sky-200/20 bg-[rgba(18,22,34,0.8)] p-2.5 shadow-[0_22px_52px_-24px_rgba(0,0,0,0.86),0_0_0_1px_rgba(125,211,252,0.14),0_0_28px_-16px_rgba(56,189,248,0.42)] backdrop-blur-md transition duration-150 ${
              utilityOpen
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-[0.96] opacity-0"
            }`}
            style={{
              width:
                "min(18rem, calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 1.5rem))",
              maxHeight: "calc(100% - 3.5rem)",
            }}
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
                    className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                    aria-pressed={surfaceMode === "SIMULATOR"}
                    onClick={() => {
                      setSurfaceMode("SIMULATOR");
                      setPathRecording(false);
                      setShadowRecording(false);
                    }}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                    aria-pressed={surfaceMode === "STATS"}
                    onClick={() => {
                      setSurfaceMode("STATS");
                      setPathRecording(false);
                      setShadowRecording(false);
                      if (statsArm == null) armKind("SHOT");
                    }}
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
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      aria-pressed={sport === opt.id}
                      onClick={() => setSport(opt.id)}
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
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      aria-pressed={pathRecording}
                      onClick={() => {
                        setPathRecording((prev) => {
                          const next = !prev;
                          if (next) setShadowRecording(false);
                          return next;
                        });
                      }}
                    >
                      Path
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      aria-pressed={shadowRecording}
                      onClick={() => {
                        setShadowRecording((prev) => {
                          const next = !prev;
                          if (next) setPathRecording(false);
                          return next;
                        });
                      }}
                    >
                      Shadow
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      onClick={onExportPitchPng}
                    >
                      Export
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                      onClick={onSharePitchPng}
                    >
                      Share
                    </Button>
                  </div>
                  {pitchExportError ? (
                    <p
                      role="status"
                      className="text-[9px] text-amber-200/90"
                    >
                      {pitchExportError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Stats Events
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {STATS_PRIMARY_EVENT_KINDS.map((kind) => (
                        <Button
                          key={kind}
                          type="button"
                          variant="secondary"
                          className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                          aria-pressed={statsArm === kind}
                          onClick={() => armKind(kind)}
                        >
                          {statsEventLabel(kind)}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {STATS_SECONDARY_EVENT_KINDS.map((kind) => (
                        <Button
                          key={kind}
                          type="button"
                          variant="secondary"
                          className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                          aria-pressed={statsArm === kind}
                          onClick={() => armKind(kind)}
                        >
                          {statsEventLabel(kind)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Review
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        aria-pressed={reviewMode === "live"}
                        onClick={() => setReviewMode("live")}
                      >
                        Live
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        aria-pressed={reviewMode === "halftime"}
                        onClick={() => setReviewMode("halftime")}
                      >
                        HT
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        aria-pressed={reviewMode === "full_time"}
                        onClick={() => setReviewMode("full_time")}
                      >
                        FT
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Voice
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {!recorder.isRecording ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                          disabled={!canStatsVoiceRecord}
                          onClick={() => void onStartVoice()}
                        >
                          Record
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                          onClick={() => void onStopVoice()}
                        >
                          Stop
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        disabled={!pendingVoiceId || !lastStatsEvent}
                        onClick={onAttachVoiceToLastEvent}
                      >
                        Last Event
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        disabled={!pendingVoiceId}
                        onClick={onAttachVoiceAsMoment}
                      >
                        Voice Moment
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        disabled={!pendingVoiceId}
                        onClick={onDropPendingVoice}
                      >
                        Drop Clip
                      </Button>
                    </div>
                    {voiceError || recorder.error ? (
                      <p role="alert" className="text-[9px] text-rose-300/90">
                        {voiceError ?? recorder.error}
                      </p>
                    ) : null}
                    {!canStatsVoiceRecord ? (
                      <p className="text-[9px] text-stone-300/70">
                        Voice recording is available in Live review.
                      </p>
                    ) : null}
                    {voiceMomentIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {voiceMomentIds.slice(-4).map((voiceId) => (
                          <Button
                            key={voiceId}
                            type="button"
                            variant="secondary"
                            className="pointer-events-auto min-h-7 rounded-lg px-2 py-0.5 text-[9px]"
                            onClick={() => playVoiceNote(voiceId)}
                          >
                            ▶ {voiceId.slice(0, 6)}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    {statsEventsWithVoice.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {statsEventsWithVoice.map((event) => (
                          <Button
                            key={event.id}
                            type="button"
                            variant="secondary"
                            className="pointer-events-auto min-h-7 rounded-lg px-2 py-0.5 text-[9px]"
                            onClick={() => {
                              if (event.voiceNoteId) playVoiceNote(event.voiceNoteId);
                            }}
                          >
                            ▶ {statsEventLabel(event.kind)}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        .simulator-direct .pitch-wrapper {
          height: 100dvh !important;
          padding: 0.35rem !important;
          border-radius: 0 !important;
          background: #0b0f0c !important;
        }

        .simulator-direct .simulator-pitch-host {
          border-radius: 0.6rem !important;
        }

        .simulator-direct .simulator-pitch-wrapper {
          border-radius: 0 !important;
          background: #0b0f0c !important;
        }

        .simulator-direct canvas {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
