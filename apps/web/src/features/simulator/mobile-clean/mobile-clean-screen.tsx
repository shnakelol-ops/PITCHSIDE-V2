"use client";

import { useEffect, useState } from "react";

import { PurePitchSurface } from "@src/features/simulator/mobile-clean/pure-pitch-surface";

const ROTATE_MESSAGE = "Rotate to landscape to use Matchday Mode";

function isLandscapeViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth > window.innerHeight;
}

export function MobileCleanScreen() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(isLandscapeViewport());
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  if (!isLandscape) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black px-6 text-center">
        <p className="text-base font-medium text-white">{ROTATE_MESSAGE}</p>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-black">
      <PurePitchSurface />
    </main>
  );
}
