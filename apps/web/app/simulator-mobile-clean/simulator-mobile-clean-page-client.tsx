"use client";

import { useEffect, useState } from "react";

import { SimulatorMobileCleanPixi } from "./simulator-mobile-clean-pixi";

export default function SimulatorMobileCleanPageClient() {
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const sync = () => setIsLandscape(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  if (isLandscape == null) {
    return <div className="min-h-[100dvh] bg-[#040607]" aria-hidden />;
  }

  if (!isLandscape) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#040607] px-6 text-center">
        <p className="text-base font-medium text-zinc-100">
          Rotate to landscape to use Matchday Mode
        </p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#040607]">
      <SimulatorMobileCleanPixi />
    </div>
  );
}
