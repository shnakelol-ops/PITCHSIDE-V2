"use client";

import { useCallback, useState } from "react";

import { StatsBoardShell } from "@src/features/stats/board/stats-board-shell";
import { StatsPitchSurface } from "@src/features/stats/board/stats-pitch-surface";
import type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";

const MAX_REHEARSAL_MARKERS = 64;

/**
 * Phase 1: Konva pitch + pointer → board-normalised payload + optional rehearsal dots.
 * No persistence, event taxonomy, or simulator coupling.
 */
export function StatsBoardPhase1() {
  const [markers, setMarkers] = useState<{ nx: number; ny: number }[]>([]);
  const [last, setLast] = useState<StatsPitchTapPayload | null>(null);

  const onPitchTap = useCallback((payload: StatsPitchTapPayload) => {
    setLast(payload);
    setMarkers((prev) => {
      const next = [...prev, { nx: payload.nx, ny: payload.ny }];
      if (next.length > MAX_REHEARSAL_MARKERS) next.splice(0, next.length - MAX_REHEARSAL_MARKERS);
      return next;
    });
  }, []);

  return (
    <StatsBoardShell className="min-h-[22rem]">
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/80">
          Stats board · Phase 1
        </p>
        {last ? (
          <p className="font-mono text-[10px] tabular-nums text-emerald-100/90">
            nx {last.nx.toFixed(3)} · ny {last.ny.toFixed(3)}
          </p>
        ) : (
          <p className="text-[10px] text-emerald-200/55">Tap pitch</p>
        )}
      </div>
      <div className="relative z-0 flex min-h-0 min-w-0 flex-1">
        <div className="flex h-full min-h-0 w-full items-center justify-center p-2">
          <StatsPitchSurface
            className="h-full max-h-full w-full max-w-full"
            onPitchTap={onPitchTap}
            tapMarkers={markers}
          />
        </div>
      </div>
    </StatsBoardShell>
  );
}
