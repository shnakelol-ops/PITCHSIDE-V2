"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { SimulatorMatchdayScreenV1 } from "@src/features/simulator/simulator-matchday-screen-v1";
import { SimulatorFloatingShell } from "@src/features/simulator/simulator-floating-shell";

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
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => {
      setIsMobileViewport(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  if (isMobileViewport) {
    return (
      <SimulatorMatchdayScreenV1
        initialSurfaceMode={initialSurfaceMode}
        linkedMatchId={linkedMatchId}
      />
    );
  }

  return (
    <SimulatorFloatingShell
      initialSurfaceMode={initialSurfaceMode}
      linkedMatchId={linkedMatchId}
    />
  );
}
