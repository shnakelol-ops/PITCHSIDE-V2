import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Your coaching command centre for teams, matches, and modules."
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-pitchside-600 via-pitchside-700 to-pitchside-900 p-8 text-white shadow-panel dark:border-pitchside-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pitchside-100">
            Pitchside
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Welcome to your foundation dashboard
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-pitchside-50">
            This screen is intentionally light on business logic: it orients
            coaches around the three core modules while the monorepo enforces
            clean boundaries between board, stats, and review code.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/teams/new"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pitchside-200 hover:shadow-panel dark:border-slate-800 dark:bg-slate-950"
          >
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-pitchside-700 dark:text-white dark:group-hover:text-pitchside-300">
              Create team
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Register a squad shell before attaching players and fixtures.
            </p>
          </Link>
          <Link
            href="/players/new"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pitchside-200 hover:shadow-panel dark:border-slate-800 dark:bg-slate-950"
          >
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-pitchside-700 dark:text-white dark:group-hover:text-pitchside-300">
              Add player
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Build out your roster so stats and board labels stay consistent.
            </p>
          </Link>
          <Link
            href="/matches/new"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pitchside-200 hover:shadow-panel dark:border-slate-800 dark:bg-slate-950"
          >
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-pitchside-700 dark:text-white dark:group-hover:text-pitchside-300">
              New match
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Open a match container that board, stats, and review can share.
            </p>
          </Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-pitchside-700 dark:text-pitchside-300">
              Board module
            </h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Future home for scenes, objects, and saved tactical frames tied to
              Prisma `BoardScene` and `BoardObject` records.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-pitchside-700 dark:text-pitchside-300">
              Stats module
            </h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Lives in `@pitchside/stats-engine` so event logic never imports the
              board package directly.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-pitchside-700 dark:text-pitchside-300">
              Review module
            </h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Will bridge stats outputs into overlays using shared match data and
              `ReviewSnapshot` rows.
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-dashed border-pitchside-300 bg-pitchside-50/60 p-6 text-sm text-pitchside-900 shadow-inner dark:border-pitchside-800 dark:bg-pitchside-950/40 dark:text-pitchside-50">
          <h3 className="text-base font-semibold">Architecture locked in</h3>
          <p className="mt-2 max-w-3xl text-pitchside-900/80 dark:text-pitchside-100/90">
            The monorepo ships strict TypeScript, shared Zod contracts in
            `@pitchside/validation`, and Prisma access funnelled through
            `@pitchside/data-access`. Feature logic for teams, players, matches,
            engines, and auth stays out of this foundation pass on purpose.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
