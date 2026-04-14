"use client";

import { useRef } from "react";

import {
  PitchCanvas,
  type PitchCanvasHandle,
} from "@src/components/pitch-canvas/PitchCanvas";
import { cn } from "@pitchside/utils";

/**
 * Example parent: one `PitchCanvas`, foundation demo on for smoke-testing.
 * Replace `foundationDemo` with `false` when wiring real simulator content via ref.
 */
export function TacticalBoard({ className }: { className?: string }) {
  const canvasRef = useRef<PitchCanvasHandle>(null);

  return (
    <div
      className={cn(
        "flex w-full max-w-4xl flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-3",
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        PitchCanvas foundation (single WebGL canvas)
      </p>
      <PitchCanvas
        ref={canvasRef}
        className="w-full rounded-lg ring-1 ring-white/5"
        foundationDemo
      />
    </div>
  );
}
