"use client";

import { useEffect, useState } from "react";

import { MobileCleanPixiPitch } from "./mobile-clean-pixi-pitch";

const PORTRAIT_MESSAGE = "Rotate to landscape to use Matchday Mode";

function readLandscape(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: landscape)").matches;
}

export function MobileCleanScreen() {
  const [isLandscape, setIsLandscape] = useState<boolean>(readLandscape);

  useEffect(() => {
    const media = window.matchMedia("(orientation: landscape)");
    const onChange = () => setIsLandscape(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return (
    <main className="h-[100dvh] w-[100dvw] overflow-hidden bg-black text-white">
      {isLandscape ? (
        <MobileCleanPixiPitch />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center text-base font-medium">
          {PORTRAIT_MESSAGE}
        </div>
      )}
    </main>
  );
}
