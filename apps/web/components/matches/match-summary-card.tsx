type MatchSummaryCardProps = {
  teamName: string;
  opponentDisplay: string;
  competition: string;
  venue: string;
  matchDate: string;
};

export function MatchSummaryCard({
  teamName,
  opponentDisplay,
  competition,
  venue,
  matchDate,
}: MatchSummaryCardProps) {
  const items = [
    { label: "Team", value: teamName },
    { label: "Opponent", value: opponentDisplay },
    { label: "Competition", value: competition },
    { label: "Venue", value: venue },
    { label: "Kickoff", value: matchDate },
  ];

  return (
    <section
      className="rounded-[1.25rem] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/90 px-4 py-5 shadow-[0_10px_36px_-14px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.03)] ring-1 ring-slate-900/[0.03] backdrop-blur-sm sm:px-6 sm:py-6 dark:border-slate-800/85 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/95 dark:shadow-[0_14px_44px_-18px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.04)] dark:ring-white/[0.04]"
      aria-label="Match summary"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-pitchside-700 dark:text-pitchside-400">
          At a glance
        </h2>
      </div>
      <div className="mt-5 flex flex-col divide-y divide-slate-200/80 dark:divide-slate-800 sm:mt-6 sm:flex-row sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 flex-1 py-4 first:pt-0 last:pb-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {item.label}
            </p>
            <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50 sm:text-base">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
