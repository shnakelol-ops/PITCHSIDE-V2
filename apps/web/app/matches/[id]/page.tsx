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
      mainClassName="flex min-h-0 flex-col bg-gradient-to-b from-slate-100/95 via-slate-50 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[92rem] flex-1 flex-col gap-6 pb-10 lg:gap-8 lg:pb-12">
        <div className="shrink-0 space-y-4">
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
        </div>

        <MatchWorkspaceLiveProvider
          matchId={match.id}
          teamId={match.teamId}
          teamSport={match.team.sport}
          players={roster}
          initialPeriod={match.currentPeriod}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-[calc(100dvh-14rem)]">
            <div className="relative flex min-h-[22rem] flex-1 flex-col rounded-[1.25rem] bg-gradient-to-br from-pitchside-600/[0.12] via-pitchside-500/[0.04] to-transparent p-[3px] shadow-[0_20px_44px_-24px_rgba(15,118,110,0.32)] ring-1 ring-pitchside-900/[0.06] dark:from-pitchside-500/[0.14] dark:via-pitchside-600/[0.06] dark:shadow-[0_26px_52px_-22px_rgba(0,0,0,0.48)] dark:ring-white/[0.06] lg:min-h-0">
              <BoardV1Panel
                matchId={match.id}
                rightPanel={
                  <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-1 py-2 sm:px-2">
                    <MatchLiveSidebar />
                    <MatchReviewTeaser />
                  </div>
                }
              />
            </div>
          </div>
        </MatchWorkspaceLiveProvider>
      </div>
    </AppShell>
  );
}
