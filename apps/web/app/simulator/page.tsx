import { Suspense } from "react";

import SimulatorPageClient from "./simulator-page-client";

/** Warm grass field — soft vertical drift, no flat grey chrome at viewport edge. */
export default function SimulatorPage() {
  return (
    <div className="h-full bg-[#9FAF7A] bg-gradient-to-b from-[#aab892] via-[#9FAF7A] to-[#8f9f72] text-stone-800">
      <Suspense
        fallback={<div className="h-full" aria-hidden />}
      >
        <SimulatorPageClient />
      </Suspense>
    </div>
  );
}
