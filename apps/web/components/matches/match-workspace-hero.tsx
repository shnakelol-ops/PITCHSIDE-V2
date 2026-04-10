import type { ReactNode } from "react";

type MatchWorkspaceHeroProps = {
  teamName: string;
  opponentDisplay: string;
  formattedDate: string;
  competition: string | null | undefined;
  venue: string | null | undefined;
  sportLabel: string | null;
};

function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/70 bg-white/90 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-slate-800 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:border-slate-600/80 dark:bg-slate-800/90 dark:text-slate-100 dark:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.4)]">
      {children}
    </span>
  );
}

export function MatchWorkspaceHero({
  teamName,
  opponentDisplay,
  formattedDate,
  competition,
  venue,
  sportLabel,
}: MatchWorkspaceHeroProps) {
  const comp = competition?.trim();
  const ven = venue?.trim();

  return (
    <header className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/60 bg-slate-950 text-white shadow-[0_24px_64px_-28px_rgba(15,118,110,0.55)] ring-1 ring-white/10 dark:border-slate-800 dark:ring-white/5">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(52,211,153,0.35),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/2 h-[120%] w-[55%] -translate-y-1/2 rounded-full bg-pitchside-500/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        aria-hidden
      />

      <div className="relative px-6 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-4xl space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-pitchside-300">
              Fixture
            </p>
            <h1 className="text-balance font-bold tracking-tight">
              <span className="block text-4xl leading-[1.05] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.02]">
                {teamName}
              </span>
              <span className="mt-3 flex items-center gap-3 sm:mt-4">
                <span
                  className="inline-flex h-px w-10 bg-gradient-to-r from-transparent to-white/50 sm:w-14"
                  aria-hidden
                />
                <span className="text-lg font-medium uppercase tracking-[0.35em] text-pitchside-200/90 sm:text-xl">
                  vs
                </span>
                <span
                  className="inline-flex h-px flex-1 max-w-[6rem] bg-gradient-to-l from-transparent to-white/50 sm:max-w-[10rem]"
                  aria-hidden
                />
              </span>
              <span className="mt-2 block text-4xl leading-[1.05] text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.02]">
                {opponentDisplay}
              </span>
            </h1>
            <p className="text-base text-slate-300 sm:text-lg">
              <span className="font-medium text-white">{formattedDate}</span>
              <span className="text-slate-500"> · </span>
              <span className="text-slate-400">Match workspace</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            {comp && comp.length > 0 ? <MetaBadge>{comp}</MetaBadge> : null}
            {ven && ven.length > 0 ? <MetaBadge>{ven}</MetaBadge> : null}
            {sportLabel ? <MetaBadge>{sportLabel}</MetaBadge> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
