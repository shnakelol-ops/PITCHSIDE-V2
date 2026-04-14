import { Suspense } from "react";

import SimulatorPageClient from "./simulator-page-client";

/** Warm grass field — soft vertical drift, no flat grey chrome at viewport edge. */
export default function SimulatorPage() {
  return (
    <div className="simulator-root min-h-[100dvh] bg-[#0b0f0c] text-stone-100">
      <Suspense
        fallback={<div className="simulator-root min-h-[100dvh]" aria-hidden />}
      >
        <SimulatorPageClient />
      </Suspense>
    </div>
  );
}
