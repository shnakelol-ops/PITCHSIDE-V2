"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PitchSport } from "@/config/pitchConfig";
import {
  SimulatorPixiSurface,
  type SimulatorPixiSurfaceHandle,
  type SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
import { useStatsEventLog } from "@src/features/stats/hooks/use-stats-event-log";
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
  const [statsExpanded, setStatsExpanded] = useState(false);
  const utilityWrapRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<SimulatorPixiSurfaceHandle>(null);
  const {
    events: statsEvents,
    arm: statsArm,
    reviewMode,
    armKind,
    logTap,
    setReviewMode,
  } = useStatsEventLog();

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

  useEffect(() => {
    if (surfaceMode !== "STATS") {
      setStatsExpanded(false);
      return;
    }
    if (statsArm == null) {
      armKind("SHOT");
    }
  }, [armKind, statsArm, surfaceMode]);

  return (
    <div className="simulator-direct relative h-[100dvh] min-h-0 overflow-hidden bg-[#0b0f0c]">
      <div className="absolute inset-0">
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
        <div className="pointer-events-auto absolute bottom-[max(0.6rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-[rgba(16,18,26,0.74)] px-2 py-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.78)] backdrop-blur-md">
            <Button
              type="button"
              variant="secondary"
              className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
              onClick={() => surfaceRef.current?.play()}
            >
              Play
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
              onClick={() => surfaceRef.current?.pause()}
            >
              Pause
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-8 rounded-lg border border-white/15 bg-[rgba(34,38,48,0.82)] px-3 py-1 text-[11px] text-stone-100"
              onClick={() => surfaceRef.current?.reset()}
            >
              Reset
            </Button>
          </div>
        </div>

        <aside
          ref={utilityWrapRef}
          className="pointer-events-auto absolute right-[max(0.9rem,env(safe-area-inset-right))] top-1/2 z-40 -translate-y-1/2"
        >
          <button
            type="button"
            aria-label={utilityOpen ? "Close utility menu" : "Open utility menu"}
            aria-expanded={utilityOpen}
            className={`ml-auto inline-flex size-12 items-center justify-center rounded-full border transition duration-150 ${
              utilityOpen
                ? "border-sky-300/65 bg-[rgba(34,66,112,0.88)] text-sky-100 shadow-[0_0_0_1px_rgba(125,211,252,0.45),0_16px_36px_-18px_rgba(56,189,248,0.65)]"
                : "border-sky-300/45 bg-[rgba(28,38,56,0.92)] text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_20px_44px_-22px_rgba(14,165,233,0.55),0_18px_36px_-20px_rgba(0,0,0,0.8)]"
            }`}
            onClick={() => setUtilityOpen((v) => !v)}
          >
            <SlidersHorizontal className="size-5" />
          </button>
          <div
            className={`mt-2 w-[11.5rem] origin-top-right rounded-[18px] border border-sky-200/20 bg-[rgba(18,22,34,0.8)] p-2.5 shadow-[0_22px_52px_-24px_rgba(0,0,0,0.86),0_0_0_1px_rgba(125,211,252,0.14),0_0_28px_-16px_rgba(56,189,248,0.42)] backdrop-blur-md transition duration-150 ${
              utilityOpen
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-[0.96] opacity-0"
            }`}
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
                    className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                    aria-pressed={surfaceMode === "SIMULATOR"}
                    onClick={() => {
                      setSurfaceMode("SIMULATOR");
                      setPathRecording(false);
                      setShadowRecording(false);
                      setStatsExpanded(false);
                    }}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
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
                      className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
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
                      className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
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
                      className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
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
                          className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                          aria-pressed={statsArm === kind}
                          onClick={() => armKind(kind)}
                        >
                          {statsEventLabel(kind)}
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-8 w-full rounded-lg px-2 py-1 text-[10px]"
                      onClick={() => setStatsExpanded((prev) => !prev)}
                    >
                      {statsExpanded ? "Hide More Events" : "More Events"}
                    </Button>
                    {statsExpanded ? (
                      <div className="grid grid-cols-2 gap-1">
                        {STATS_SECONDARY_EVENT_KINDS.map((kind) => (
                          <Button
                            key={kind}
                            type="button"
                            variant="secondary"
                            className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                            aria-pressed={statsArm === kind}
                            onClick={() => armKind(kind)}
                          >
                            {statsEventLabel(kind)}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/86">
                      Review
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        aria-pressed={reviewMode === "live"}
                        onClick={() => setReviewMode("live")}
                      >
                        Live
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        aria-pressed={reviewMode === "halftime"}
                        onClick={() => setReviewMode("halftime")}
                      >
                        HT
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-8 rounded-lg px-2 py-1 text-[10px]"
                        aria-pressed={reviewMode === "full_time"}
                        onClick={() => setReviewMode("full_time")}
                      >
                        FT
                      </Button>
                    </div>
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
          min-height: calc(100dvh - 0.7rem) !important;
          max-height: calc(100dvh - 0.7rem) !important;
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
