import { Suspense } from "react";

import SimulatorPageClient from "./simulator-page-client";

/** Simulator route wrapper. */
export default function SimulatorPage() {
  return (
    <div className="simulator-root min-h-[100dvh] bg-[#0b0f0c] text-stone-100">
      <Suspense fallback={null}>
        <SimulatorPageClient />
      </Suspense>
    </div>
  );
}
