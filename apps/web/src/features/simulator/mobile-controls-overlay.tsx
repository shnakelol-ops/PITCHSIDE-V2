"use client";

import { useState } from "react";

type OverlayPanel = "menu" | "voice" | "event" | null;

const baseButtonClass =
  "pointer-events-auto inline-flex items-center justify-center border border-lime-300/70 bg-gradient-to-b from-lime-300 to-lime-500 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1e2a06] shadow-[0_14px_28px_-18px_rgba(0,0,0,0.95)] active:translate-y-px";

function panelClass(side: "left" | "right"): string {
  return [
    "pointer-events-auto absolute top-1/2 z-[1000] max-w-[min(16rem,calc(100vw-6.5rem))] -translate-y-1/2 rounded-2xl border border-lime-200/80 bg-[rgba(180,220,75,0.95)] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1f2a08] shadow-[0_22px_46px_-30px_rgba(0,0,0,0.95)]",
    side === "left"
      ? "left-[max(5.8rem,calc(env(safe-area-inset-left)+5.2rem))]"
      : "right-[max(5.8rem,calc(env(safe-area-inset-right)+5.2rem))]",
  ].join(" ");
}

export function MobileControlsOverlay() {
  const [openPanel, setOpenPanel] = useState<OverlayPanel>(null);

  const togglePanel = (panel: Exclude<OverlayPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[999] md:hidden"
      style={{ pointerEvents: "none" }}
      aria-label="Mobile controls overlay"
    >
      <div
        className="pointer-events-none absolute top-1/2 z-[1000] -translate-y-1/2"
        style={{ left: "max(0.65rem, env(safe-area-inset-left))" }}
      >
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            className={`${baseButtonClass} h-12 w-[4.75rem] rounded-full`}
            onClick={() => togglePanel("menu")}
            aria-pressed={openPanel === "menu"}
            style={{ pointerEvents: "auto" }}
          >
            Menu
          </button>
          <button
            type="button"
            className={`${baseButtonClass} h-12 w-[4.75rem] rounded-full`}
            onClick={() => togglePanel("voice")}
            aria-pressed={openPanel === "voice"}
            style={{ pointerEvents: "auto" }}
          >
            Voice
          </button>
        </div>
      </div>

      <div
        className="pointer-events-none absolute top-1/2 z-[1000] -translate-y-1/2"
        style={{ right: "max(0.65rem, env(safe-area-inset-right))" }}
      >
        <button
          type="button"
          className={`${baseButtonClass} size-16 rounded-full text-[9px] leading-tight tracking-[0.1em]`}
          onClick={() => togglePanel("event")}
          aria-pressed={openPanel === "event"}
          style={{ pointerEvents: "auto" }}
        >
          Log Event
        </button>
      </div>

      {openPanel === "menu" ? (
        <section className={panelClass("left")} aria-label="Menu panel">
          MENU OPEN
        </section>
      ) : null}

      {openPanel === "voice" ? (
        <section className={panelClass("left")} aria-label="Voice panel">
          VOICE OPEN
        </section>
      ) : null}

      {openPanel === "event" ? (
        <section className={panelClass("right")} aria-label="Event panel">
          EVENT PANEL OPEN
        </section>
      ) : null}
    </div>
  );
}
