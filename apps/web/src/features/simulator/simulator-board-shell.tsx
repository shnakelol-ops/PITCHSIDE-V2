"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { PitchSport } from "@/config/pitchConfig";
import {
  SimulatorPixiSurface,
  type SimulatorPixiSurfaceHandle,
} from "@src/features/simulator/pixi/simulator-pixi-surface";
import { cn } from "@pitchside/utils";

const SPORT_OPTIONS: { id: PitchSport; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic" },
  { id: "hurling", label: "Hurling" },
];

/**
 * Worn natural sideline grass (cricket-strip inspiration) — dry, uneven, not flat UI fill.
 * Spec palette: #9FAF7A, #AFA785, #8F9B6A.
 */
const GRASS = {
  fresh: "#9FAF7A",
  dry: "#AFA785",
  worn: "#8F9B6A",
};

/** Fractal noise for fine grain + slight patchiness; data URL via `encodeURIComponent`. */
const grassNoiseDataUrl = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="5" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

/** Softer noise for clay / apron — blurred in CSS for premium texture (not gritty). */
const clayNoiseDataUrl = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="c"><feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#c)"/></svg>',
)}")`;

/** Barely-there concentric curves — stadium lane memory, not a literal track. */
const laneCurvesDataUrl = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="384" viewBox="0 0 512 384" preserveAspectRatio="none"><ellipse cx="256" cy="198" rx="232" ry="158" fill="none" stroke="#3a3028" stroke-width="0.9" opacity="0.045"/><ellipse cx="256" cy="200" rx="210" ry="142" fill="none" stroke="#3a3028" stroke-width="0.85" opacity="0.034"/><ellipse cx="256" cy="202" rx="188" ry="126" fill="none" stroke="#3a3028" stroke-width="0.8" opacity="0.026"/><ellipse cx="256" cy="204" rx="166" ry="110" fill="none" stroke="#3a3028" stroke-width="0.75" opacity="0.02"/></svg>',
)}")`;

/** Muted terracotta / clay (no athletics orange). */
const CLAY = {
  deep: "#6e5a52",
  mid: "#7d6860",
  light: "#8c756c",
};

/** Chalk / cream line at pitch boundary — soft, not stark white. */
const CHALK_LINE = "rgba(252, 248, 240, 0.52)";

/** Canvas well only (Pixi aperture). Floating UI uses warm glass, not flat grey panels. */
const C = {
  canvasWell: "#1a1f16",
};

/** Warm neutral glass for floating controls (stone family, not cold grey). */
const FLOAT = {
  bg: "rgba(58, 54, 48, 0.52)",
  border: "rgba(255, 248, 240, 0.09)",
  title: "rgba(245, 240, 232, 0.55)",
  shadow: "0 16px 48px -12px rgba(18, 16, 12, 0.28), 0 4px 16px -6px rgba(18, 16, 12, 0.12)",
};

/** Thin stadium apron: clay band + lane whispers — Pixi / layout unchanged. */
const stadiumApronStyle: CSSProperties = {
  backgroundColor: CLAY.mid,
  backgroundImage: [
    `linear-gradient(180deg, rgba(159,175,122,0.26) 0%, transparent 11%, transparent 89%, rgba(132,142,108,0.18) 100%)`,
    `linear-gradient(168deg, ${CLAY.light} 0%, ${CLAY.mid} 44%, ${CLAY.deep} 100%)`,
    `radial-gradient(ellipse 98% 72% at 50% 32%, rgba(255,252,248,0.07), transparent 55%)`,
    `radial-gradient(ellipse 92% 58% at 50% 118%, rgba(42, 34, 30, 0.1), transparent 50%)`,
  ].join(", "),
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(38, 30, 26, 0.07)",
};

/** Uneven field: soft diagonals + gentle vertical drift + light radials (no flat panel fill). */
const grassFieldStyle: CSSProperties = {
  backgroundColor: GRASS.fresh,
  backgroundImage: [
    `linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 38%, rgba(55, 62, 40, 0.035) 100%)`,
    `linear-gradient(101deg, ${GRASS.worn} 0%, transparent 26%, ${GRASS.dry} 50%, transparent 70%, ${GRASS.worn} 94%)`,
    `radial-gradient(ellipse 95% 60% at 72% 18%, rgba(175,167,133,0.22), transparent 54%)`,
    `radial-gradient(ellipse 80% 50% at 12% 85%, rgba(100, 108, 72, 0.1), transparent 56%)`,
  ].join(", "),
};

const btnBase =
  "min-h-10 w-full justify-center rounded-xl px-3 py-2.5 text-[11px] font-semibold tracking-wide shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_3px_10px_-3px_rgba(0,0,0,0.14)] transition-[transform,box-shadow,background-color,border-color,color] duration-150 sm:min-h-9 sm:py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#9FAF7A] active:translate-y-px active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.18)]";

const btnIdle =
  "!border !border-white/[0.08] !bg-[rgba(52,48,44,0.55)] !text-[rgba(250,248,244,0.92)] hover:!border-white/[0.11] hover:!bg-[rgba(58,54,50,0.62)] hover:!text-white backdrop-blur-md";

const btnSportOn =
  "!border !border-[rgba(90,110,88,0.45)] !bg-[rgba(42,52,40,0.65)] !text-stone-50 hover:!border-[rgba(100,118,96,0.5)] hover:!bg-[rgba(48,58,46,0.72)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md";

const btnRecordOn =
  "!border !border-amber-900/25 !bg-[rgba(72,58,48,0.58)] !text-amber-50/95 hover:!border-amber-800/35 hover:!bg-[rgba(78,64,52,0.62)] backdrop-blur-md";

const btnShadowOn =
  "!border !border-white/[0.1] !bg-[rgba(50,54,48,0.58)] !text-stone-100 hover:!border-white/[0.12] hover:!bg-[rgba(56,60,54,0.64)] backdrop-blur-md";

function ToolRail({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-3 backdrop-blur-xl",
        className,
      )}
      style={{
        backgroundColor: FLOAT.bg,
        borderColor: FLOAT.border,
        boxShadow: FLOAT.shadow,
      }}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
        <span
          className="size-1.5 shrink-0 rounded-full bg-[rgba(200,192,176,0.35)] ring-1 ring-white/[0.08]"
          aria-hidden
        />
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: FLOAT.title }}
        >
          {title}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 pt-1.5">{children}</div>
    </div>
  );
}

/**
 * Board-centred coaching console — worn natural grass surround only (no Pixi / pitch edits).
 */
export function SimulatorBoardShell() {
  const [sport, setSport] = useState<PitchSport>("gaelic");
  const [pathRecording, setPathRecording] = useState(false);
  const [shadowRecording, setShadowRecording] = useState(false);
  const surfaceRef = useRef<SimulatorPixiSurfaceHandle>(null);

  const setMainRecording = (on: boolean) => {
    setPathRecording(on);
    if (on) setShadowRecording(false);
  };

  const setShadowLineRecording = (on: boolean) => {
    setShadowRecording(on);
    if (on) setPathRecording(false);
  };

  return (
    <div
      className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden text-stone-800"
      style={grassFieldStyle}
    >
      {/* Minimal grain only (~2.8%) — enough to kill “flat UI”, not noisy. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.028] mix-blend-multiply"
        style={{
          backgroundImage: grassNoiseDataUrl,
          backgroundSize: "240px 240px",
        }}
        aria-hidden
      />
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-stone-800/65">
            Pitchside
          </p>
          <h1 className="truncate text-base font-semibold tracking-tight text-stone-900/95 sm:text-[17px]">
            Match simulator
          </h1>
          <p className="hidden text-[11px] text-stone-800/60 sm:block">
            Field view — training strip in natural grass.
          </p>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-center lg:gap-8 lg:px-10 lg:py-6 xl:gap-12 xl:px-14">
        <aside className="order-2 flex shrink-0 flex-row gap-3 lg:order-1 lg:w-[11rem] lg:flex-col lg:justify-center">
          <ToolRail title="Transport" className="min-w-0 flex-1 lg:flex-none">
            <div
              className="grid grid-cols-3 gap-1.5 lg:grid-cols-1"
              role="group"
              aria-label="Playback transport"
            >
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, btnIdle)}
                onClick={() => surfaceRef.current?.play()}
              >
                Play
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, btnIdle)}
                onClick={() => surfaceRef.current?.pause()}
              >
                Pause
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, btnIdle)}
                onClick={() => surfaceRef.current?.reset()}
              >
                Reset
              </Button>
            </div>
          </ToolRail>
        </aside>

        <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center lg:order-2 lg:max-w-[min(96vw,74rem)]">
          <div className="relative w-full max-w-full px-1 sm:px-2">
            {/* Soft lift behind pitch — no hard frame ring */}
            <div
              className="pointer-events-none absolute -inset-4 rounded-[1.75rem] bg-[radial-gradient(ellipse_at_50%_42%,rgba(62,70,48,0.14),transparent_68%)] blur-xl"
              aria-hidden
            />
            <div
              className="relative overflow-hidden rounded-[1.2rem] p-2 sm:p-2.5"
              style={{
                backgroundColor: GRASS.fresh,
                backgroundImage: [
                  `linear-gradient(188deg, rgba(175,167,133,0.16) 0%, transparent 48%, rgba(143,155,106,0.1) 100%)`,
                  `linear-gradient(88deg, ${GRASS.worn} 0%, transparent 32%, rgba(255,255,255,0.025) 54%, transparent 78%, ${GRASS.dry} 100%)`,
                ].join(", "),
                boxShadow:
                  "0 28px 64px -24px rgba(22, 26, 16, 0.22), 0 12px 32px -18px rgba(22, 26, 16, 0.12)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.022] mix-blend-multiply"
                style={{
                  backgroundImage: grassNoiseDataUrl,
                  backgroundSize: "180px 180px",
                }}
                aria-hidden
              />
              {/*
                Stadium apron: muted clay band, faint lane curves, chalk at pitch — Pixi untouched.
              */}
              <div
                className="relative z-10 overflow-hidden rounded-[1.05rem] p-1 sm:p-1.5"
                style={stadiumApronStyle}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.038] mix-blend-multiply [filter:blur(0.65px)]"
                  style={{
                    backgroundImage: clayNoiseDataUrl,
                    backgroundSize: "220px 220px",
                  }}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.32]"
                  style={{
                    backgroundImage: laneCurvesDataUrl,
                    backgroundSize: "cover",
                    backgroundPosition: "50% 52%",
                  }}
                  aria-hidden
                />
                <div
                  className="relative overflow-hidden rounded-xl"
                  style={{
                    backgroundColor: C.canvasWell,
                    boxShadow: [
                      `inset 0 0 0 1px ${CHALK_LINE}`,
                      `inset 0 0 0 2px rgba(111, 143, 90, 0.78)`,
                      "inset 0 0 0 3px rgba(159, 175, 122, 0.14)",
                      "inset 0 14px 36px -4px rgba(0,0,0,0.26)",
                      "inset 0 5px 14px rgba(0,0,0,0.12)",
                      "0 0 8px rgba(38, 48, 30, 0.1)",
                      "0 0 18px rgba(32, 42, 26, 0.06)",
                    ].join(", "),
                  }}
                >
                  <SimulatorPixiSurface
                    ref={surfaceRef}
                    sport={sport}
                    recordingMode={pathRecording}
                    shadowRecordingMode={shadowRecording}
                    className="max-h-[min(68dvh,calc(100dvw-2.5rem))] w-full !rounded-lg !border-0 !bg-transparent !shadow-none !ring-0 sm:max-h-[min(72dvh,80vw)] lg:max-h-[min(78dvh,58rem)]"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md px-3 text-center text-[10px] font-medium uppercase leading-relaxed tracking-[0.14em] text-stone-800/55 sm:mt-5 sm:text-[11px] sm:tracking-[0.16em]">
            Select a player · draw on the pitch · transport on the left
          </p>
        </div>

        <aside className="order-3 flex shrink-0 flex-row flex-wrap gap-3 lg:w-[11rem] lg:flex-col lg:justify-center">
          <ToolRail title="Pitch" className="min-w-0 flex-1 basis-[48%] lg:basis-auto lg:flex-none">
            <div className="flex flex-col gap-1.5" role="group" aria-label="Pitch sport">
              {SPORT_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  variant="secondary"
                  className={cn(
                    btnBase,
                    sport === opt.id ? btnSportOn : btnIdle,
                  )}
                  onClick={() => setSport(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </ToolRail>
          <ToolRail title="Capture" className="min-w-0 flex-1 basis-[48%] lg:basis-auto lg:flex-none">
            <div className="flex flex-col gap-1.5" role="group" aria-label="Path capture">
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, pathRecording ? btnRecordOn : btnIdle)}
                aria-pressed={pathRecording}
                onClick={() => setMainRecording(!pathRecording)}
              >
                {pathRecording ? "Recording path…" : "Record path"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(btnBase, shadowRecording ? btnShadowOn : btnIdle)}
                aria-pressed={shadowRecording}
                onClick={() => setShadowLineRecording(!shadowRecording)}
              >
                {shadowRecording ? "Shadow line…" : "Shadow line"}
              </Button>
            </div>
          </ToolRail>
        </aside>
      </main>
    </div>
  );
}
