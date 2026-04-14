import Link from "next/link";

import { prisma } from "@pitchside/data-access";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { formatMatchDate } from "@/lib/format-date";
import { formatOpponentForDisplay } from "@/lib/format-display-name";

function displayText(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : "—";
}

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const matches = await prisma.match.findMany({
    orderBy: { matchDate: "desc" },
    select: {
      id: true,
      opponentName: true,
      competition: true,
      venue: true,
      matchDate: true,
      status: true,
      team: { select: { name: true } },
    },
  });

  return (
    <AppShell
      title="Matches"
      subtitle="Open a match workspace or create a new fixture."
    >
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </p>
          <Link href="/matches/new">
            <Button>New Match</Button>
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            No matches yet. Create your first match to start board, stats, and review workflows.
          </div>
        ) : (
          <ul className="space-y-3">
            {matches.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-pitchside-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-pitchside-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {displayText(match.team?.name)} vs{" "}
                        {formatOpponentForDisplay(match.opponentName)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatMatchDate(match.matchDate)}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:text-slate-300">
                      {match.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    {displayText(match.competition)} • {displayText(match.venue)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
