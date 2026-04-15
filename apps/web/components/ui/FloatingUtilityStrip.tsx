"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SurfaceMode = "SIMULATOR" | "STATS";
type PitchType = "soccer" | "gaelic" | "hurling";

type FloatingUtilityStripProps = {
  mode: SurfaceMode;
  pitchType: PitchType;
  eventFilterEnabled: boolean;
  reviewModeLabel: "HT" | "FT";
  voicePulse: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onModeChange: (mode: SurfaceMode) => void;
  onPitchTypeChange: (pitch: PitchType) => void;
  onToggleRecordPath: () => void;
  onToggleShadowLine: () => void;
  onExportPng: () => void;
  onToggleEventFilter: () => void;
  onToggleReviewMode: () => void;
  onVoiceNoteTrigger: () => void;
};

const coreButtonClass =
  "inline-flex min-h-8 items-center justify-center rounded-lg border border-white/15 bg-[rgba(18,20,30,0.72)] px-2.5 py-1 text-[10px] font-medium text-stone-100/92 shadow-[0_6px_16px_-12px_rgba(0,0,0,0.65)] backdrop-blur-md transition hover:border-white/25 hover:bg-[rgba(24,28,38,0.78)]";

const utilityButtonClass =
  "inline-flex min-h-9 w-full items-center justify-start rounded-xl border border-white/10 bg-[rgba(18,20,30,0.64)] px-3 py-2 text-[11px] font-medium text-stone-100/90 backdrop-blur-md transition hover:border-white/20 hover:bg-[rgba(24,28,38,0.78)]";

export function FloatingUtilityStrip({
  mode,
  pitchType,
  eventFilterEnabled,
  reviewModeLabel,
  voicePulse,
  onPlay,
  onPause,
  onReset,
  onModeChange,
  onPitchTypeChange,
  onToggleRecordPath,
  onToggleShadowLine,
  onExportPng,
  onToggleEventFilter,
  onToggleReviewMode,
  onVoiceNoteTrigger,
}: FloatingUtilityStripProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!open) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (wrapRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div className="pointer-events-auto absolute left-1/2 top-2 w-[calc(100%-1rem)] max-w-[42rem] -translate-x-1/2 rounded-xl border border-white/10 bg-[rgba(20,20,30,0.75)] p-1.5 shadow-[0_18px_38px_-24px_rgba(0,0,0,0.72)] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={coreButtonClass} onClick={onPlay}>
            Play
          </button>
          <button type="button" className={coreButtonClass} onClick={onPause}>
            Pause
          </button>
          <button type="button" className={coreButtonClass} onClick={onReset}>
            Reset
          </button>
          <button
            type="button"
            className={coreButtonClass}
            onClick={() =>
              onModeChange(mode === "SIMULATOR" ? "STATS" : "SIMULATOR")
            }
          >
            {mode === "SIMULATOR" ? "Mode: Sim" : "Mode: Stats"}
          </button>
          <div className="ml-auto flex items-center gap-1">
            {(["soccer", "gaelic", "hurling"] as const).map((pitch) => (
              <button
                key={pitch}
                type="button"
                className={coreButtonClass}
                aria-pressed={pitchType === pitch}
                onClick={() => onPitchTypeChange(pitch)}
              >
                {pitch === "soccer"
                  ? "Soccer"
                  : pitch === "gaelic"
                    ? "Gaelic"
                    : "Hurling"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={wrapRef} className="pointer-events-auto absolute bottom-4 right-4">
        <button
          type="button"
          aria-label="Open simulator utilities"
          className="inline-flex size-12 items-center justify-center rounded-full border border-white/15 bg-[rgba(20,20,30,0.8)] text-stone-100 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.75)] backdrop-blur-md transition hover:border-white/25 hover:bg-[rgba(28,30,44,0.88)]"
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal className="size-5" />
        </button>

        <div
          className={`absolute bottom-14 right-0 w-[min(70vw,17rem)] origin-bottom-right rounded-2xl border border-white/12 bg-[rgba(20,20,30,0.75)] p-2 shadow-[0_20px_46px_-20px_rgba(0,0,0,0.78)] backdrop-blur-md transition duration-150 ${
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0"
          }`}
        >
          {mode === "SIMULATOR" ? (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                className={utilityButtonClass}
                onClick={onToggleRecordPath}
              >
                Record Path
              </button>
              <button
                type="button"
                className={utilityButtonClass}
                onClick={onToggleShadowLine}
              >
                Shadow Line
              </button>
              <button
                type="button"
                className={utilityButtonClass}
                onClick={onExportPng}
              >
                Export PNG
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                className={utilityButtonClass}
                onClick={onToggleEventFilter}
              >
                Event Filter: {eventFilterEnabled ? "On" : "Off"}
              </button>
              <button
                type="button"
                className={utilityButtonClass}
                onClick={onToggleReviewMode}
              >
                Review Toggle: {reviewModeLabel}
              </button>
              <button
                type="button"
                className={`${utilityButtonClass} ${
                  voicePulse ? "border-emerald-300/45 text-emerald-100" : ""
                }`}
                onClick={onVoiceNoteTrigger}
              >
                Voice Note (UI)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
