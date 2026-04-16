import { SimulatorFloatingShell } from "@src/features/simulator/simulator-floating-shell";

type SimulatorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Same heuristic as `POST /api/events` `matchId` (CUID). */
function isPersistableMatchId(raw: string | null): raw is string {
  if (raw == null || raw.length < 20) return false;
  return /^c[a-z0-9]{20,}$/i.test(raw);
}

function firstString(v: string | string[] | undefined): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

export default async function SimulatorPage({ searchParams }: SimulatorPageProps) {
  const sp = (await searchParams) ?? {};
  const mode = firstString(sp.mode);
  const matchIdRaw = firstString(sp.matchId);
  const initialSurfaceMode = mode === "stats" ? "STATS" : "SIMULATOR";
  const linkedMatchId = isPersistableMatchId(matchIdRaw) ? matchIdRaw : null;

  return (
    <SimulatorFloatingShell
      initialSurfaceMode={initialSurfaceMode}
      linkedMatchId={linkedMatchId}
    />
  );
}
