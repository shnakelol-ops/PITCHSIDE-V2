"use client";

import { useSearchParams } from "next/navigation";

import { SimulatorBoardShell } from "@src/features/simulator";

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

  return (
    <SimulatorBoardShell
      initialSurfaceMode={initialSurfaceMode}
      linkedMatchId={linkedMatchId}
    />
  );
}
