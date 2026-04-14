"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { PitchSport } from "@/config/pitchConfig";
import {
  SimulatorPixiSurface,
  type SimulatorPixiSurfaceHandle,
  type SimulatorSurfaceMode,
} from "@src/features/simulator/pixi/simulator-pixi-surface";

/** Same heuristic as `POST /api/events` `matchId` (CUID). */
const PITCH_OPTIONS: { id: PitchSport; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic" },
  { id: "hurling", label: "Hurling" },
];

export default function SimulatorPageClient() {
  const sp = useSearchParams();
  const mode = sp.get("mode");
  const [surfaceMode, setSurfaceMode] = useState<SimulatorSurfaceMode>(
    mode === "stats" ? "STATS" : "SIMULATOR",
  );
  const [sport, setSport] = useState<PitchSport>("gaelic");
  const [pathRecording, setPathRecording] = useState(false);
  const [shadowRecording, setShadowRecording] = useState(false);
  const surfaceRef = useRef<SimulatorPixiSurfaceHandle>(null);

  useEffect(() => {
    document.documentElement.classList.add("simulator-route");
    document.body.classList.add("simulator-route");
    return () => {
      document.documentElement.classList.remove("simulator-route");
      document.body.classList.remove("simulator-route");
    };
  }, []);

  return (
    <div className="simulator-direct relative h-[100dvh] min-h-0 overflow-hidden bg-[#0b0f0c]">
      <div className="absolute inset-0">
        <SimulatorPixiSurface
          ref={surfaceRef}
          sport={sport}
          recordingMode={surfaceMode === "SIMULATOR" ? pathRecording : false}
          shadowRecordingMode={surfaceMode === "SIMULATOR" ? shadowRecording : false}
          surfaceMode={surfaceMode}
          statsArm={null}
          statsLoggedEvents={[]}
          statsPitchInteractive={false}
          className="h-full w-full !max-h-[100dvh] !rounded-md !border-0 !bg-transparent !shadow-none !ring-0"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-30">
        <div className="pointer-events-auto absolute bottom-3 left-1/2 z-40 -translate-x-1/2">
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

        <aside className="pointer-events-auto absolute right-3 top-1/2 z-40 w-[11.25rem] -translate-y-1/2">
          <div className="space-y-2 rounded-2xl border border-white/12 bg-[rgba(20,20,30,0.75)] p-2.5 shadow-[0_22px_48px_-24px_rgba(0,0,0,0.78)] backdrop-blur-md">
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/80">
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
                  }}
                >
                  Stats
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/80">
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

            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-300/80">
                Capture
              </p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={surfaceMode === "STATS"}
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
                  disabled={surfaceMode === "STATS"}
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
