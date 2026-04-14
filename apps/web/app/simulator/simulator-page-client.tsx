"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { SimulatorBoardShell } from "@src/features/simulator/simulator-board-shell";

/** Same heuristic as `POST /api/events` `matchId` (CUID). */
function isPersistableMatchId(raw: string | null): raw is string {
  if (raw == null || raw.length < 20) return false;
  return /^c[a-z0-9]{20,}$/i.test(raw);
}

export default function SimulatorPageClient() {
  const sp = useSearchParams();
  const mode = sp.get("mode");
  const matchIdRaw = sp.get("matchId");
  const initialSurfaceMode = mode === "stats" ? "STATS" : "SIMULATOR";
  const linkedMatchId = isPersistableMatchId(matchIdRaw) ? matchIdRaw : null;

  useEffect(() => {
    document.documentElement.classList.add("simulator-route");
    document.body.classList.add("simulator-route");
    return () => {
      document.documentElement.classList.remove("simulator-route");
      document.body.classList.remove("simulator-route");
    };
  }, []);

  return (
    <SimulatorBoardShell
      initialSurfaceMode={initialSurfaceMode}
      linkedMatchId={linkedMatchId}
    />
  );
}
