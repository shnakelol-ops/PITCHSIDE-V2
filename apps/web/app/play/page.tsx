import SimulatorPageClient from "../simulator/simulator-page-client";

type PlayPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const sp = (await searchParams) ?? {};
  return (
    <SimulatorPageClient
      mode={firstString(sp.mode)}
      matchIdRaw={firstString(sp.matchId)}
    />
  );
}
