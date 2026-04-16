import { SimulatorFloatingShell } from "@src/features/simulator/simulator-floating-shell";

/** Same heuristic as `POST /api/events` `matchId` (CUID). */
function isPersistableMatchId(raw: string | null): raw is string {
  if (raw == null || raw.length < 20) return false;
  return /^c[a-z0-9]{20,}$/i.test(raw);
}

export default function SimulatorPageClient({
  mode,
  matchIdRaw,
}: {
  mode?: string;
  matchIdRaw?: string;
}) {
  const initialSurfaceMode = mode === "stats" ? "STATS" : "SIMULATOR";
  const linkedMatchId = isPersistableMatchId(matchIdRaw ?? null) ? matchIdRaw : null;

  return (
    <SimulatorFloatingShell
      initialSurfaceMode={initialSurfaceMode}
      linkedMatchId={linkedMatchId}
    />
  );
}
