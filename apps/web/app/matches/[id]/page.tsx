import { notFound } from "next/navigation";

import { prisma } from "@pitchside/data-access";

import { AppShell } from "@/components/layout/app-shell";
import { BoardV1Panel } from "@/components/matches/board-v1-panel";
import { MatchReviewTeaser } from "@/components/matches/match-review-teaser";
import { MatchSummaryCard } from "@/components/matches/match-summary-card";
import { MatchWorkspaceHero } from "@/components/matches/match-workspace-hero";
import { MatchLiveSidebar } from "@/components/matches/match-live-sidebar";
import { MatchWorkspaceLiveProvider } from "@/components/matches/match-workspace-live-context";
import { formatMatchDate } from "@/lib/format-date";
import { formatOpponentForDisplay } from "@/lib/format-display-name";

type MatchWorkspacePageProps = {
  params: Promise<{ id: string }>;
};

/** Avoid showing mistaken CUID values (e.g. team id copied into opponent_name) as labels. */
function looksLikeCuid(value: string): boolean {
  return /^c[a-z0-9]{24}$/i.test(value.trim());
}

function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "—";
}

function teamLabelFromDb(name: string | null | undefined): string {
  const t = name?.trim() ?? "";
  if (!t) return "Your Team";
  if (looksLikeCuid(t)) return "Your Team";
  return t;
}

function opponentLabelFromDb(opponentName: string): string {
  const t = opponentName.trim();
  if (!t) return "Opponent";
  if (looksLikeCuid(t)) return "Opponent";
  return t;
}

function sportLabelFromEnum(sport: string | undefined): string | null {
  if (!sport) return null;
  const map: Record<string, string> = {
    GAELIC_FOOTBALL: "Gaelic football",
    SOCCER: "Soccer",
    HURLING: "Hurling",
  };
  return map[sport] ?? null;
}

export default async function MatchWorkspacePage({
  params,
}: MatchWorkspacePageProps) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      team: { select: { name: true, sport: true } },
    },
  });

  if (!match) {
    notFound();
  }

  const players = await prisma.player.findMany({
    where: { teamId: match.teamId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nickname: true,
    },
  });

  const roster = players.map((p) => {
    const nick = p.nickname?.trim();
    const name = nick && nick.length > 0 ? nick : `${p.firstName} ${p.lastName}`.trim();
    return { id: p.id, name };
  });

  const formattedDate = formatMatchDate(match.matchDate);

  const teamName = teamLabelFromDb(match.team?.name);
  const opponentRaw = opponentLabelFromDb(match.opponentName);
  const opponentDisplay = formatOpponentForDisplay(opponentRaw);
  const pageTitleForShell = `${teamName} vs ${opponentDisplay}`;

  const sportLabel = sportLabelFromEnum(match.team?.sport);

  return (
    <AppShell
      title="Match workspace"
      subtitle={pageTitleForShell}
      mainClassName="bg-gradient-to-b from-slate-100/95 via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950"
    >
      <div className="mx-auto flex max-w-[92rem] flex-col gap-10 pb-12 lg:gap-12">
        <MatchWorkspaceHero
          teamName={teamName}
          opponentDisplay={opponentDisplay}
          formattedDate={formattedDate}
          competition={match.competition}
          venue={match.venue}
          sportLabel={sportLabel}
        />

        <MatchSummaryCard
          teamName={teamName}
          opponentDisplay={opponentDisplay}
          competition={displayText(match.competition)}
          venue={displayText(match.venue)}
          matchDate={formattedDate}
        />

        <MatchWorkspaceLiveProvider
          matchId={match.id}
          teamId={match.teamId}
          teamSport={match.team.sport}
          players={roster}
          initialPeriod={match.currentPeriod}
        >
          <div className="grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-x-0 lg:gap-y-10">
            <div className="relative min-w-0 lg:col-span-8 lg:border-r lg:border-slate-200/90 lg:pr-8 xl:pr-12 dark:lg:border-slate-800/90">
              <div className="relative rounded-[1.25rem] bg-gradient-to-br from-pitchside-600/[0.12] via-pitchside-500/[0.04] to-transparent p-[3px] shadow-[0_20px_44px_-24px_rgba(15,118,110,0.32)] ring-1 ring-pitchside-900/[0.06] dark:from-pitchside-500/[0.14] dark:via-pitchside-600/[0.06] dark:shadow-[0_26px_52px_-22px_rgba(0,0,0,0.48)] dark:ring-white/[0.06]">
                <BoardV1Panel matchId={match.id} />
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-col gap-5 border-t border-slate-200/80 pt-10 lg:sticky lg:top-24 lg:col-span-4 lg:self-start lg:border-t-0 lg:pl-8 lg:pt-0 xl:pl-10 dark:border-slate-800 dark:lg:border-t-0">
              <MatchLiveSidebar />
              <MatchReviewTeaser />
            </div>
          </div>
        </MatchWorkspaceLiveProvider>
      </div>
    </AppShell>
  );
}
