export function MatchReviewTeaser() {
  return (
    <aside
      className="relative overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/95 to-white p-6 shadow-[0_12px_38px_-16px_rgba(15,23,42,0.11),0_0_0_1px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.035] transition-shadow duration-200 hover:shadow-[0_16px_44px_-18px_rgba(15,23,42,0.13)] dark:border-slate-700/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_16px_46px_-20px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.05)] dark:ring-white/[0.05] dark:hover:shadow-[0_20px_52px_-20px_rgba(0,0,0,0.52)] sm:p-7"
      aria-label="Review module"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,transparent_35%,rgba(16,185,129,0.07)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-pitchside-500/80 via-pitchside-400/50 to-transparent"
        aria-hidden
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-800 dark:text-slate-100">
            Match review
          </h2>
          <span className="rounded-full border border-pitchside-500/25 bg-pitchside-500/[0.09] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-pitchside-800 shadow-sm dark:border-pitchside-400/25 dark:bg-pitchside-400/10 dark:text-pitchside-200">
            Planned
          </span>
        </div>
        <p className="mt-3.5 text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
          Clips, board snapshots, and a narrative timeline—tied to this
          match’s stats and scenes.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Designed for debriefs in one place: replay context, not scattered
          notes.
        </p>
      </div>
    </aside>
  );
}
