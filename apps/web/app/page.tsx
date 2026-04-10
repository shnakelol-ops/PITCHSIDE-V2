import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-pitchside-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-20 lg:flex-row lg:items-center lg:gap-24 lg:py-28">
        <div className="flex-1 space-y-8">
          <p className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pitchside-700 shadow-sm ring-1 ring-pitchside-100 dark:bg-slate-900 dark:text-pitchside-300 dark:ring-pitchside-900">
            Board · Stats · Review
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              Coach the full match, not just the whiteboard.
            </h1>
            <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
              Pitchside is a modular foundation for gaelic football coaching: plan
              on the board, log what happens on the pitch, then review how the
              story matches the plan.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl bg-pitchside-600 px-6 py-3 text-sm font-semibold text-white shadow-panel transition hover:bg-pitchside-700"
            >
              Open dashboard
            </Link>
            <Link
              href="/matches/new"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-pitchside-200 hover:text-pitchside-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:border-pitchside-800"
            >
              Start a new match
            </Link>
          </div>
        </div>
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-pitchside-700 dark:text-pitchside-300">
              Board
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Scenes and objects anchored to real matches, ready for tactical
              storytelling on the pitch.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-pitchside-700 dark:text-pitchside-300">
              Stats
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Structured events, clock, and pitch zones without coupling to how
              the board renders them.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-panel backdrop-blur sm:col-span-2 dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-pitchside-700 dark:text-pitchside-300">
              Review
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Snapshots that will later stitch stats back into board overlays so
              staff see plan versus reality in one glance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
