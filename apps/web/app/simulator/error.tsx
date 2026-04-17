"use client";

import { useEffect } from "react";

export default function SimulatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[simulator] route error", error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#9FAF7A] bg-gradient-to-b from-[#aab892] via-[#9FAF7A] to-[#8f9f72] text-stone-900 p-6">
      <div className="max-w-md rounded-2xl border border-white/25 bg-white/75 p-6 shadow-xl backdrop-blur">
        <h1 className="text-lg font-semibold">Simulator couldn’t start</h1>
        <p className="mt-2 text-sm text-stone-700">
          The pitch surface failed to initialise. Try reloading — your session is safe.
        </p>
        {error?.message ? (
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-stone-900/90 p-3 text-[11px] leading-tight text-stone-100">
            {error.message}
          </pre>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-9 items-center rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white hover:bg-stone-800"
          >
            Try again
          </button>
          <a
            href="/simulator"
            className="inline-flex min-h-9 items-center rounded-lg border border-stone-400 bg-white px-3 text-sm font-semibold text-stone-900 hover:bg-stone-50"
          >
            Reload route
          </a>
        </div>
      </div>
    </div>
  );
}
