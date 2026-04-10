"use client";

import { Bell, Plus, Search } from "lucide-react";
import Link from "next/link";

type TopbarProps = {
  title: string;
  subtitle?: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <label className="relative flex w-full max-w-md items-center sm:w-72">
            <span className="sr-only">Search</span>
            <Search
              className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search teams, players, matches…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-pitchside-500/30 placeholder:text-slate-400 focus:border-pitchside-500 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-pitchside-200 hover:text-pitchside-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-pitchside-800"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <Link
              href="/matches/new"
              className="inline-flex items-center gap-2 rounded-xl bg-pitchside-600 px-4 py-2 text-sm font-semibold text-white shadow-panel transition hover:bg-pitchside-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New Match
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
