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
import {
  formatSimulatorClockDisplay,
  useSimulatorMatchClock,
} from "@src/features/stats/hooks/use-simulator-match-clock";
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
  const [showLabels, setShowLabels] = useState(true);
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
  const matchClock = useSimulatorMatchClock(surfaceMode === "STATS");
  const { phase: matchPhase, setPhase: setMatchPhase, firstHalfSec, secondHalfSec } =
    matchClock;
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
  const clockDisplay = useMemo(
    () => formatSimulatorClockDisplay(matchPhase, firstHalfSec, secondHalfSec),
    [firstHalfSec, matchPhase, secondHalfSec],
  );

  useEffect(() => {
    if (surfaceMode === "STATS") {
      if (statsArm == null) {
        armKind("SHOT");
      }
      if (matchPhase === "pre_match") {
        setMatchPhase("first_half");
      }
      return;
    }
    if (pendingVoiceId) {
      removeVoiceBlob(pendingVoiceId);
      setPendingVoiceId(null);
    }
    setVoiceError(null);
  }, [
    armKind,
    matchPhase,
    pendingVoiceId,
    removeVoiceBlob,
    setMatchPhase,
    statsArm,
    surfaceMode,
  ]);

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

  const selectStatsEvent = useCallback(
    (kind: StatsV1EventKind) => {
      armKind(kind);
      setUtilityOpen(false);
    },
    [armKind],
  );

  const onSetLiveReview = useCallback(() => {
    setReviewMode("live");
    if (matchPhase === "pre_match" || matchPhase === "halftime" || matchPhase === "full_time") {
      setMatchPhase("first_half");
    }
  }, [matchPhase, setMatchPhase, setReviewMode]);

  const onSetHalftimeReview = useCallback(() => {
    if (matchPhase === "pre_match") {
      setMatchPhase("first_half");
    }
    setReviewMode("halftime");
    setMatchPhase("halftime");
  }, [matchPhase, setMatchPhase, setReviewMode]);

  const onSetFullTimeReview = useCallback(() => {
    setReviewMode("full_time");
    setMatchPhase("full_time");
  }, [setMatchPhase, setReviewMode]);

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
          showAthleteLabels={showLabels}
          className="h-full w-full !max-h-[100dvh] !rounded-md !border-0 !bg-transparent !shadow-none !ring-0"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-30">
        <div className="pointer-events-none absolute bottom-[max(0.55rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2">
          <div className="simulator-transport-strip pointer-events-none flex items-center gap-1 rounded-xl px-2 py-1 backdrop-blur-md">
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

        {surfaceMode === "STATS" ? (
          <aside
            className="pointer-events-none absolute left-[max(0.45rem,env(safe-area-inset-left))] top-1/2 z-40 -translate-y-1/2"
            aria-label="Live matchday rail"
          >
            <div className="simulator-live-rail pointer-events-none flex w-[3.2rem] flex-col items-stretch gap-1 rounded-2xl p-1.5 backdrop-blur-md">
              <Button
                type="button"
                variant="secondary"
                className="simulator-live-rail-chip pointer-events-auto min-h-9 rounded-xl px-1 py-1 text-[9px] font-semibold"
                aria-pressed={reviewMode === "live"}
                onClick={onSetLiveReview}
              >
                {clockDisplay}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="simulator-live-rail-chip pointer-events-auto min-h-8 rounded-lg px-1 py-1 text-[9px] font-semibold"
                aria-pressed={reviewMode === "halftime"}
                onClick={onSetHalftimeReview}
              >
                HT
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="simulator-live-rail-chip pointer-events-auto min-h-8 rounded-lg px-1 py-1 text-[9px] font-semibold"
                aria-pressed={reviewMode === "full_time"}
                onClick={onSetFullTimeReview}
              >
                FT
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="utility-gold-action simulator-live-rail-chip pointer-events-auto min-h-8 rounded-lg px-1 py-1 text-[9px] font-semibold"
                disabled={!canStatsVoiceRecord && !recorder.isRecording}
                onClick={() => {
                  if (recorder.isRecording) {
                    void onStopVoice();
                    return;
                  }
                  void onStartVoice();
                }}
              >
                {recorder.isRecording ? "Stop" : "Voice"}
              </Button>
            </div>
          </aside>
        ) : null}

        <aside
          ref={utilityWrapRef}
          className="pointer-events-none absolute z-40 flex flex-col items-end"
          style={{
            top: "max(0.55rem, env(safe-area-inset-top))",
            right: "max(0.45rem, env(safe-area-inset-right))",
            bottom: "max(0.55rem, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            aria-label={utilityOpen ? "Close utility menu" : "Open utility menu"}
            aria-expanded={utilityOpen}
            className={`simulator-utility-trigger pointer-events-auto ml-auto inline-flex size-11 items-center justify-center rounded-full border transition duration-150 ${
              utilityOpen
                ? "is-open text-amber-50"
                : "text-slate-100"
            }`}
            onClick={() => setUtilityOpen((v) => !v)}
          >
            <SlidersHorizontal className="size-5" />
          </button>
          <div
            className={`simulator-utility-panel mt-1.5 origin-top-right overflow-y-auto rounded-[16px] p-2 transition duration-150 ${
              utilityOpen
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-[0.96] opacity-0"
            }`}
            style={{
              width:
                "min(12.75rem, calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 0.7rem))",
              maxHeight: "min(64dvh, calc(100% - 3rem))",
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
                  <Button
                    type="button"
                    variant="secondary"
                    className="pointer-events-auto min-h-8 w-full rounded-lg px-2 py-1 text-[10px]"
                    aria-pressed={showLabels}
                    onClick={() => setShowLabels((prev) => !prev)}
                  >
                    Labels {showLabels ? "On" : "Off"}
                  </Button>
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
                          onClick={() => selectStatsEvent(kind)}
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
                          onClick={() => selectStatsEvent(kind)}
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
                        onClick={onSetLiveReview}
                      >
                        Live
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        aria-pressed={reviewMode === "halftime"}
                        onClick={onSetHalftimeReview}
                      >
                        HT
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        aria-pressed={reviewMode === "full_time"}
                        onClick={onSetFullTimeReview}
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
                          className="utility-gold-action pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
                          disabled={!canStatsVoiceRecord}
                          onClick={() => void onStartVoice()}
                        >
                          Record
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          className="utility-gold-action pointer-events-auto min-h-8 rounded-lg px-2 py-1 text-[10px]"
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

        .simulator-direct .simulator-transport-strip {
          border: 1px solid rgba(186, 198, 234, 0.22) !important;
          background: linear-gradient(
            180deg,
            rgba(32, 44, 69, 0.74) 0%,
            rgba(20, 28, 47, 0.72) 100%
          ) !important;
          box-shadow: 0 14px 34px -24px rgba(0, 0, 0, 0.82) !important;
        }

        .simulator-direct .simulator-transport-strip button {
          border: 1px solid rgba(171, 186, 223, 0.28) !important;
          background: rgba(64, 80, 117, 0.56) !important;
          color: #f8fafc !important;
        }

        .simulator-direct .simulator-live-rail-shell {
          border: 1px solid rgba(177, 191, 227, 0.22) !important;
          background: linear-gradient(
            180deg,
            rgba(38, 52, 80, 0.64) 0%,
            rgba(23, 33, 54, 0.6) 100%
          ) !important;
          box-shadow: 0 16px 34px -26px rgba(0, 0, 0, 0.82) !important;
        }

        .simulator-direct .simulator-live-rail-chip {
          border: 1px solid rgba(175, 191, 226, 0.24) !important;
          background: rgba(68, 84, 122, 0.5) !important;
          color: #eef2ff !important;
          box-shadow: 0 6px 16px -14px rgba(0, 0, 0, 0.72) !important;
        }

        .simulator-direct .simulator-live-rail-chip:hover:not(:disabled) {
          background: rgba(82, 103, 146, 0.56) !important;
          border-color: rgba(196, 210, 244, 0.34) !important;
        }

        .simulator-direct .simulator-utility-trigger {
          border-color: rgba(170, 188, 228, 0.46) !important;
          background: linear-gradient(
            180deg,
            rgba(38, 54, 84, 0.92) 0%,
            rgba(23, 34, 56, 0.9) 100%
          ) !important;
          box-shadow:
            0 10px 24px -18px rgba(0, 0, 0, 0.85),
            0 0 0 1px rgba(148, 163, 184, 0.26) !important;
        }

        .simulator-direct .simulator-utility-trigger.is-open {
          border-color: rgba(245, 207, 120, 0.66) !important;
          box-shadow:
            0 0 0 1px rgba(245, 207, 120, 0.28),
            0 14px 30px -20px rgba(217, 145, 26, 0.6) !important;
        }

        .simulator-direct .simulator-utility-panel {
          border: 1px solid rgba(177, 191, 227, 0.26) !important;
          background: linear-gradient(
            180deg,
            rgba(37, 50, 78, 0.8) 0%,
            rgba(22, 32, 53, 0.76) 100%
          ) !important;
          box-shadow:
            0 20px 44px -28px rgba(0, 0, 0, 0.86),
            0 0 0 1px rgba(148, 163, 184, 0.14),
            0 0 18px -14px rgba(250, 204, 21, 0.34) !important;
        }

        .simulator-direct .simulator-utility-panel button {
          border: 1px solid rgba(175, 191, 226, 0.22) !important;
          background: rgba(68, 84, 122, 0.52) !important;
          color: #eef2ff !important;
          box-shadow: 0 6px 16px -14px rgba(0, 0, 0, 0.72) !important;
        }

        .simulator-direct .simulator-utility-panel button:hover:not(:disabled) {
          background: rgba(82, 103, 146, 0.56) !important;
          border-color: rgba(196, 210, 244, 0.34) !important;
        }

        .simulator-direct .simulator-utility-panel button[aria-pressed="true"],
        .simulator-direct .simulator-utility-panel button.utility-gold-action:not(:disabled) {
          border-color: rgba(246, 210, 130, 0.62) !important;
          background: rgba(112, 92, 48, 0.56) !important;
          color: #fff8e6 !important;
          box-shadow:
            0 0 0 1px rgba(246, 210, 130, 0.16),
            0 10px 20px -16px rgba(217, 145, 26, 0.62) !important;
        }

        .simulator-direct .simulator-utility-panel button:disabled {
          opacity: 0.52 !important;
        }

        @media (orientation: landscape) {
          .simulator-direct .simulator-left-rail {
            left: max(0.32rem, env(safe-area-inset-left)) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            bottom: auto !important;
          }

          .simulator-direct .simulator-utility-panel {
            width: min(
              11.5rem,
              calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 0.55rem)
            ) !important;
            max-height: min(72dvh, calc(100% - 2.65rem)) !important;
          }
        }

        .simulator-direct canvas {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
