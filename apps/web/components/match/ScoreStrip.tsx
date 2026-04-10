import { cn } from "@pitchside/utils";
import { ZERO_CLOCK } from "@/lib/matchClock";

type TeamScore = {
  name: string;
  goals: number;
  points: number;
};

type ScoreStripProps = {
  home: TeamScore;
  away: TeamScore;
  clock?: string;
  className?: string;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function total(goals: number, points: number): number {
  return goals * 3 + points;
}

function scoreLine(goals: number, points: number): string {
  return `${goals}-${points}`;
}

export function ScoreStrip({ home, away, clock, className }: ScoreStripProps) {
  const homeGoals = clampScore(home.goals);
  const homePoints = clampScore(home.points);
  const awayGoals = clampScore(away.goals);
  const awayPoints = clampScore(away.points);

  const homeTotal = total(homeGoals, homePoints);
  const awayTotal = total(awayGoals, awayPoints);
  const clockDisplay = clock && clock.trim().length > 0 ? clock : ZERO_CLOCK;

  return (
    <section
      aria-label="Score strip"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0 text-left">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {home.name}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {scoreLine(homeGoals, homePoints)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 px-3 py-1 text-center text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <p>
            {homeTotal} - {awayTotal}
          </p>
          <p className="mt-0.5 font-mono text-[11px] tracking-wide text-slate-600 dark:text-slate-300">
            {clockDisplay}
          </p>
        </div>

        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {away.name}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {scoreLine(awayGoals, awayPoints)}
          </p>
        </div>
      </div>
    </section>
  );
}
