/**
 * Route: /stats-board (App Router).
 * Previous version used `next/dynamic` + `ssr: false` at the page level, which Next.js 15
 * rejects in Server Components (build error / failed page). Restore the stats surface via a
 * dedicated `"use client"` wrapper when re-enabling Phase 6.
 */
export default function StatsBoardPage() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-5xl flex-col items-center justify-center px-4 py-16">
      <h1 className="text-center text-4xl font-black tracking-tight text-emerald-400">
        STATS BOARD WORKING
      </h1>
    </main>
  );
}
