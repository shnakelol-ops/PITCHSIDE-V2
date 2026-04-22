import { Suspense } from "react";

import SimulatorPageClient from "./simulator-page-client";

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" aria-hidden />}>
      <SimulatorPageClient />
    </Suspense>
  );
}
