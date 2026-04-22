import { Suspense } from "react";

import SimulatorMobileCleanPageClient from "./simulator-mobile-clean-page-client";

export default function SimulatorMobileCleanPage() {
  return (
    <div className="min-h-[100dvh] bg-[#040607] text-white">
      <Suspense fallback={<div className="min-h-[100dvh]" aria-hidden />}>
        <SimulatorMobileCleanPageClient />
      </Suspense>
    </div>
  );
}
