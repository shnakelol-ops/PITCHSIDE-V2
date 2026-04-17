"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type { FederatedPointerEvent } from "pixi.js";

import {
  getPitchBoardAspectRatio,
  type PitchSport,
} from "@/config/pitchConfig";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";
import { mountGaelicPitchRenderer } from "@src/features/simulator/renderer/GaelicPitchRenderer";
import { mountPremiumPitchRenderer } from "@src/features/simulator/renderer/PremiumPitchRenderer";
import { createDefaultMicroAthletes } from "@src/features/simulator/model/micro-athlete";
import { MovementPathStore } from "@src/features/simulator/path/movement-path-store";
import { drawMovementPathsGraphics } from "@src/features/simulator/pixi/movement-path-graphics";
import { drawShadowRunsGraphics } from "@src/features/simulator/pixi/shadow-path-graphics";
import { drawShadowPlaybackGhosts } from "@src/features/simulator/pixi/shadow-playback-ghost";
import { mountAthletesPixi } from "@src/features/simulator/pixi/simulator-athletes-pixi";
import { drawStatsEventsGraphics } from "@src/features/simulator/pixi/stats-event-graphics";
import { SimulatorPlaybackController } from "@src/features/simulator/playback/simulator-playback-controller";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import type { StatsV1EventKind } from "@src/features/stats/model/stats-v1-event-kind";
import type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";
import { letterboxPitchWorld, viewportCssToBoardNorm } from "@src/lib/pitch-coordinates";
import { cn } from "@pitchside/utils";

/** Subtle turf grain on HTML wrapper only — not used by Pixi drawing. */
const pitchSurroundNoiseDataUrl = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

export type SimulatorPixiSurfaceHandle = {
  play: () => void;
  pause: () => void;
  reset: () => void;
};

export type SimulatorSurfaceMode = "SIMULATOR" | "STATS";

export type SimulatorPixiSurfaceProps = {
  sport: PitchSport;
  /** When true, draw on empty pitch records a path for the selected player (no playback). */
  recordingMode?: boolean;
  /** When true, draw records a secondary shadow path for the selected player. */
  shadowRecordingMode?: boolean;
  /**
   * Same Pixi stage: STATS shows an interactive overlay above athletes; SIMULATOR passes pointers through.
   */
  surfaceMode?: SimulatorSurfaceMode;
  /** In STATS mode, tap logs this selection (nx, ny stored as board-normalised 0–1; semantically 0–100 grid). */
  statsArm?: StatsV1EventKind | null;
  /** Dots to draw in STATS mode (single source of truth from `useStatsEventLog` or equivalent). */
  statsLoggedEvents?: readonly StatsLoggedEvent[];
  /** When set, pitch tap forwards here; parent runs `createStatsLoggedEvent` via reducer (instant feedback). */
  onStatsPitchTap?: (payload: StatsPitchTapPayload) => void;
  statsReviewMode?: StatsReviewMode;
  /** When false (e.g. HT/FT review), pitch stops accepting logs; dots stay visible. */
  statsPitchInteractive?: boolean;
  className?: string;
};

type PixiApp = import("pixi.js").Application;
type PixiContainer = import("pixi.js").Container;

function isAndroidMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|Adr/i.test(navigator.userAgent);
}

function safeRendererResolution(): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  const cap = isAndroidMobileUserAgent() ? 1.5 : 2;
  return Math.max(1, Math.min(cap, dpr));
}

/**
 * PixiJS pitch + paths + athletes + playback (ticker-driven, path store read-only).
 */
export const SimulatorPixiSurface = forwardRef<
  SimulatorPixiSurfaceHandle,
  SimulatorPixiSurfaceProps
>(function SimulatorPixiSurface(
  {
    sport,
    recordingMode = false,
    shadowRecordingMode = false,
    surfaceMode = "SIMULATOR",
    statsArm = null,
    statsLoggedEvents = [],
    onStatsPitchTap,
    statsReviewMode = "live",
    statsPitchInteractive = true,
    className,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApp | null>(null);
  const worldRef = useRef<PixiContainer | null>(null);
  const pitchHolderRef = useRef<PixiContainer | null>(null);
  const athletesLayerRef = useRef<PixiContainer | null>(null);
  const attachPitchRef = useRef<((nextSport: PitchSport) => void) | null>(null);
  const pitchDisposeRef = useRef<(() => void) | null>(null);
  const athletesDisposeRef = useRef<(() => void) | null>(null);
  const sportRef = useRef<PitchSport>(sport);
  const recordingModeRef = useRef(recordingMode);
  const shadowRecordingModeRef = useRef(shadowRecordingMode);
  const surfaceModeRef = useRef(surfaceMode);
  const statsArmRef = useRef<StatsV1EventKind | null>(statsArm);
  const onStatsPitchTapRef = useRef(onStatsPitchTap);
  const statsPitchInteractiveRef = useRef(statsPitchInteractive);
  const statsReviewModeRef = useRef(statsReviewMode);
  const statsLoggedEventsRef = useRef(statsLoggedEvents);
  const worldScaleRef = useRef(1);
  const statsPixiRef = useRef<{
    statsLayer: PixiContainer | null;
    statsHit: import("pixi.js").Graphics | null;
    statsDots: import("pixi.js").Graphics | null;
  }>({ statsLayer: null, statsHit: null, statsDots: null });

  /** Bumps after Pixi stats overlay is mounted so sync effect can run. */
  const [statsOverlayEpoch, setStatsOverlayEpoch] = useState(0);
  /** Bumps on host resize so marker min-size tracks letterbox scale. */
  const [resizeGen, setResizeGen] = useState(0);

  surfaceModeRef.current = surfaceMode;
  statsArmRef.current = statsArm;
  onStatsPitchTapRef.current = onStatsPitchTap;
  statsPitchInteractiveRef.current = statsPitchInteractive;
  statsReviewModeRef.current = statsReviewMode;
  statsLoggedEventsRef.current = statsLoggedEvents;
  const selectedAthleteIdRef = useRef<string | null>(null);
  const playbackDrivingRef = useRef(false);
  const playbackControllerRef = useRef<SimulatorPlaybackController | null>(
    null,
  );
  const releaseAthleteInputRef = useRef<(() => void) | null>(null);
  const pathStore = useMemo(() => new MovementPathStore(), []);

  sportRef.current = sport;
  recordingModeRef.current = recordingMode;
  shadowRecordingModeRef.current = shadowRecordingMode;

  useImperativeHandle(ref, () => ({
    play: () => {
      releaseAthleteInputRef.current?.();
      playbackControllerRef.current?.play();
    },
    pause: () => playbackControllerRef.current?.pause(),
    reset: () => {
      releaseAthleteInputRef.current?.();
      playbackControllerRef.current?.reset();
    },
  }));

  useEffect(() => {
    if (!recordingMode) return;
    const id = selectedAthleteIdRef.current;
    if (id != null) {
      pathStore.startPath(id);
    }
  }, [recordingMode, pathStore]);

  useEffect(() => {
    if (!shadowRecordingMode) return;
    const id = selectedAthleteIdRef.current;
    if (id != null) {
      pathStore.startShadowPath(id);
    }
  }, [shadowRecordingMode, pathStore]);

  useEffect(() => {
    if (recordingMode || shadowRecordingMode) return;
    releaseAthleteInputRef.current?.();
  }, [recordingMode, shadowRecordingMode]);

  const layout = () => {
    const app = appRef.current;
    const world = worldRef.current;
    const host = hostRef.current;
    if (!app || !world || !host) return;
    const rect = host.getBoundingClientRect();
    const w = Math.floor(host.clientWidth || rect.width);
    const h = Math.floor(host.clientHeight || rect.height);
    if (w <= 0 || h <= 0) return;
    const dpr = safeRendererResolution();
    app.renderer.resolution = dpr;
    app.renderer.resize(w, h);
    const { scale, offsetX, offsetY } = letterboxPitchWorld(w, h);
    worldScaleRef.current = scale;
    world.scale.set(scale);
    world.position.set(offsetX, offsetY);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let unsubPaths: (() => void) | null = null;
    let redrawPaths: (() => void) | null = null;
    let warmupRaf = 0;
    let warmupTimer = 0;
    let orientationTimer = 0;
    let onViewportResize: (() => void) | null = null;

    const readHostSize = () => {
      const rect = host.getBoundingClientRect();
      return {
        w: Math.floor(host.clientWidth || rect.width || 0),
        h: Math.floor(host.clientHeight || rect.height || 0),
      };
    };

    const waitForHostSize = async (): Promise<{ w: number; h: number }> => {
      for (let i = 0; i < 30; i++) {
        const size = readHostSize();
        if (size.w > 8 && size.h > 8) return size;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) break;
      }
      const fallback = readHostSize();
      return {
        w: Math.max(fallback.w, 640),
        h: Math.max(fallback.h, 400),
      };
    };

    void (async () => {
      const { Application, Container, Graphics } = await import("pixi.js");
      if (cancelled || !hostRef.current) return;

      const createInitializedApp = async () => {
        const size = await waitForHostSize();
        const initVariants = [
          {
            width: size.w,
            height: size.h,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: safeRendererResolution(),
            preference: "webgl" as const,
          },
          {
            width: size.w,
            height: size.h,
            backgroundAlpha: 0,
            antialias: false,
            autoDensity: true,
            resolution: 1,
            preference: "webgl" as const,
          },
        ];
        let lastErr: unknown = null;
        for (const variant of initVariants) {
          const candidate = new Application();
          try {
            await candidate.init(variant);
            return candidate;
          } catch (err) {
            lastErr = err;
            candidate.destroy(true);
          }
        }
        throw lastErr ?? new Error("Unable to initialize Pixi application.");
      };

      let app: import("pixi.js").Application;
      try {
        app = await createInitializedApp();
      } catch (err) {
        console.error("[simulator] Pixi initialization failed on this device.", err);
        return;
      }

      if (cancelled) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      host.appendChild(app.canvas as HTMLCanvasElement);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      app.canvas.style.display = "block";
      app.canvas.style.position = "absolute";
      app.canvas.style.inset = "0";
      app.canvas.style.touchAction = "none";
      app.canvas.style.userSelect = "none";

      const world = new Container();
      worldRef.current = world;
      app.stage.addChild(world);

      const pitchHolder = new Container();
      pitchHolderRef.current = pitchHolder;
      const pathsLayer = new Container();
      pathsLayer.sortableChildren = true;
      const shadowPathGraphics = new Graphics();
      shadowPathGraphics.zIndex = 0;
      const pathGraphics = new Graphics();
      pathGraphics.zIndex = 1;
      pathsLayer.addChild(shadowPathGraphics);
      pathsLayer.addChild(pathGraphics);
      pathsLayer.sortChildren();
      const shadowGhostLayer = new Container();
      const shadowGhostGraphics = new Graphics();
      shadowGhostLayer.addChild(shadowGhostGraphics);
      const athletesLayer = new Container();
      athletesLayer.visible = surfaceModeRef.current === "SIMULATOR";
      athletesLayerRef.current = athletesLayer;
      world.addChild(pitchHolder);
      world.addChild(pathsLayer);
      world.addChild(shadowGhostLayer);
      world.addChild(athletesLayer);

      const statsLayer = new Container();
      statsLayer.sortableChildren = true;
      const statsHit = new Graphics();
      statsHit.zIndex = 0;
      statsHit
        .rect(0, 0, BOARD_PITCH_VIEWBOX.w, BOARD_PITCH_VIEWBOX.h)
        .fill({ color: 0xffffff, alpha: 0.0001 });
      const statsInteractiveInit =
        surfaceModeRef.current === "STATS" &&
        statsPitchInteractiveRef.current &&
        statsArmRef.current != null &&
        Boolean(onStatsPitchTapRef.current);
      statsHit.eventMode = statsInteractiveInit ? "static" : "none";
      const statsDots = new Graphics();
      statsDots.eventMode = "none";
      statsDots.zIndex = 1;
      statsLayer.addChild(statsHit);
      statsLayer.addChild(statsDots);
      world.addChild(statsLayer);
      statsLayer.visible = surfaceModeRef.current === "STATS";
      statsPixiRef.current = { statsLayer, statsHit, statsDots };
      drawStatsEventsGraphics(statsDots, statsLoggedEventsRef.current, {
        reviewMode: statsReviewModeRef.current,
        worldToScreenScale: worldScaleRef.current,
      });

      const createFallbackPitchMount = (): {
        root: import("pixi.js").Container;
        dispose: () => void;
      } => {
        const root = new Container();
        const base = new Graphics();
        base.rect(0, 0, BOARD_PITCH_VIEWBOX.w, BOARD_PITCH_VIEWBOX.h).fill({
          color: 0x0b5a3d,
          alpha: 1,
        });
        base
          .rect(0.6, 0.6, BOARD_PITCH_VIEWBOX.w - 1.2, BOARD_PITCH_VIEWBOX.h - 1.2)
          .stroke({ width: 0.5, color: 0xeaf4f0, alpha: 0.5 });
        base
          .moveTo(BOARD_PITCH_VIEWBOX.w / 2, 0)
          .lineTo(BOARD_PITCH_VIEWBOX.w / 2, BOARD_PITCH_VIEWBOX.h)
          .stroke({ width: 0.35, color: 0xeaf4f0, alpha: 0.5 });
        base
          .circle(BOARD_PITCH_VIEWBOX.w / 2, BOARD_PITCH_VIEWBOX.h / 2, 9)
          .stroke({ width: 0.34, color: 0xeaf4f0, alpha: 0.5 });
        root.addChild(base);
        return {
          root,
          dispose: () => root.destroy({ children: true }),
        };
      };

      const attachPitchSafe = (nextSport: PitchSport) => {
        pitchDisposeRef.current?.();
        pitchDisposeRef.current = null;
        const holder = pitchHolderRef.current;
        if (!holder) return;
        holder.removeChildren();
        try {
          const mount =
            nextSport === "gaelic" || nextSport === "hurling"
              ? mountGaelicPitchRenderer(nextSport)
              : mountPremiumPitchRenderer(nextSport);
          holder.addChild(mount.root);
          pitchDisposeRef.current = mount.dispose;
        } catch (err) {
          console.error("[simulator] Premium pitch mount failed, using fallback pitch.", err);
          const fallback = createFallbackPitchMount();
          holder.addChild(fallback.root);
          pitchDisposeRef.current = fallback.dispose;
        }
      };
      attachPitchRef.current = attachPitchSafe;

      statsHit.on("pointerdown", (e: FederatedPointerEvent) => {
        if (surfaceModeRef.current !== "STATS") return;
        if (!statsPitchInteractiveRef.current) return;
        if (!statsArmRef.current) return;
        const fire = onStatsPitchTapRef.current;
        if (!fire) return;
        e.stopPropagation();
        const hostEl = hostRef.current;
        if (!hostEl) return;
        const r = hostEl.getBoundingClientRect();
        const stageX = e.clientX - r.left;
        const stageY = e.clientY - r.top;
        const { nx, ny } = viewportCssToBoardNorm(
          stageX,
          stageY,
          r.width,
          r.height,
        );
        fire({
          nx,
          ny,
          atMs: Date.now(),
          stageX,
          stageY,
        });
      });

      setStatsOverlayEpoch((n) => n + 1);

      attachPitchSafe(sportRef.current);
      layout();
      warmupRaf = requestAnimationFrame(() => {
        layout();
        setResizeGen((n) => n + 1);
      });
      warmupTimer = window.setTimeout(() => {
        layout();
        setResizeGen((n) => n + 1);
      }, 220);

      redrawPaths = () => {
        drawShadowRunsGraphics(shadowPathGraphics, pathStore.getAllShadowRuns());
        drawMovementPathsGraphics(
          pathGraphics,
          playbackDrivingRef.current ? [] : pathStore.getAllPaths(),
        );
      };
      redrawPaths();
      unsubPaths = pathStore.subscribe(redrawPaths);

      const athletesApi = mountAthletesPixi({
        layer: athletesLayer,
        hostEl: host,
        initialAthletes: createDefaultMicroAthletes(),
        pathRecording: {
          store: pathStore,
          isRecording: () => recordingModeRef.current,
          isShadowRecording: () => shadowRecordingModeRef.current,
          isPlaybackDriving: () => playbackDrivingRef.current,
          onSelectionChange: (id) => {
            selectedAthleteIdRef.current = id;
            if (recordingModeRef.current && id != null) {
              pathStore.startPath(id);
            }
            if (shadowRecordingModeRef.current && id != null) {
              pathStore.startShadowPath(id);
            }
          },
        },
      });
      athletesDisposeRef.current = athletesApi.dispose;
      releaseAthleteInputRef.current = athletesApi.releaseTransientInput;

      const playback = new SimulatorPlaybackController({
        ticker: app.ticker,
        pathStore,
        applyPose: (id, nx, ny, h) => {
          athletesApi.applyKinematic(id, nx, ny, h);
        },
        flushVisuals: (dirtyAthleteIds) => {
          athletesApi.flushVisuals(dirtyAthleteIds);
        },
        setPlaybackDriving: (v) => {
          playbackDrivingRef.current = v;
          redrawPaths?.();
        },
        updateShadowGhosts: (poses) => {
          drawShadowPlaybackGhosts(shadowGhostGraphics, poses);
        },
      });
      playbackControllerRef.current = playback;

      ro = new ResizeObserver(() => {
        layout();
        setResizeGen((n) => n + 1);
      });
      ro.observe(host);

      onViewportResize = () => {
        layout();
        setResizeGen((n) => n + 1);
      };
      window.addEventListener("resize", onViewportResize, { passive: true });
      window.addEventListener("orientationchange", onViewportResize);
      window.visualViewport?.addEventListener("resize", onViewportResize, {
        passive: true,
      });
      window.visualViewport?.addEventListener("scroll", onViewportResize, {
        passive: true,
      });
      orientationTimer = window.setInterval(() => {
        layout();
      }, 1000);
    })();

    return () => {
      cancelled = true;
      attachPitchRef.current = null;
      ro?.disconnect();
      ro = null;
      if (onViewportResize) {
        window.removeEventListener("resize", onViewportResize);
        window.removeEventListener("orientationchange", onViewportResize);
        window.visualViewport?.removeEventListener("resize", onViewportResize);
        window.visualViewport?.removeEventListener("scroll", onViewportResize);
      }
      onViewportResize = null;
      if (warmupRaf !== 0) {
        cancelAnimationFrame(warmupRaf);
        warmupRaf = 0;
      }
      if (warmupTimer !== 0) {
        window.clearTimeout(warmupTimer);
        warmupTimer = 0;
      }
      if (orientationTimer !== 0) {
        window.clearInterval(orientationTimer);
        orientationTimer = 0;
      }
      unsubPaths?.();
      unsubPaths = null;
      playbackControllerRef.current?.destroy();
      playbackControllerRef.current = null;
      playbackDrivingRef.current = false;
      pitchDisposeRef.current?.();
      pitchDisposeRef.current = null;
      athletesDisposeRef.current?.();
      athletesDisposeRef.current = null;
      releaseAthleteInputRef.current = null;
      athletesLayerRef.current = null;
      statsPixiRef.current = {
        statsLayer: null,
        statsHit: null,
        statsDots: null,
      };
      pitchHolderRef.current = null;
      const app = appRef.current;
      appRef.current = null;
      worldRef.current = null;
      if (app) {
        try {
          host.removeChild(app.canvas as HTMLCanvasElement);
        } catch {
          /* canvas already detached */
        }
        app.destroy(true, { children: true, texture: true });
      }
    };
  }, [pathStore]);

  useEffect(() => {
    const athletesLayer = athletesLayerRef.current;
    if (!athletesLayer) return;
    const showSimulatorAthletes = surfaceMode === "SIMULATOR";
    athletesLayer.visible = showSimulatorAthletes;
    if (!showSimulatorAthletes) {
      releaseAthleteInputRef.current?.();
    }
  }, [surfaceMode]);

  useEffect(() => {
    const { statsHit, statsDots, statsLayer } = statsPixiRef.current;
    if (!statsHit || !statsDots || !statsLayer) return;
    const canLog =
      surfaceMode === "STATS" &&
      statsPitchInteractive &&
      statsArm != null &&
      Boolean(onStatsPitchTap);
    statsHit.eventMode = canLog ? "static" : "none";
    statsLayer.visible = surfaceMode === "STATS";
    const w = hostRef.current?.clientWidth ?? 640;
    const density = w < 480 ? "compact" : "comfortable";
    drawStatsEventsGraphics(statsDots, statsLoggedEvents, {
      reviewMode: statsReviewMode,
      density,
      worldToScreenScale: worldScaleRef.current,
    });
  }, [
    surfaceMode,
    statsLoggedEvents,
    statsReviewMode,
    statsPitchInteractive,
    statsArm,
    onStatsPitchTap,
    statsOverlayEpoch,
    resizeGen,
  ]);

  useEffect(() => {
    if (!pitchHolderRef.current) return;
    attachPitchRef.current?.(sport);
    layout();
  }, [sport]);

  return (
    <div
      className="pitch-wrapper relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl p-3 sm:p-4 md:p-5"
      style={{
        backgroundColor: "#4a2f25",
        backgroundImage: [
          "linear-gradient(175deg, rgba(100, 72, 60, 0.2) 0%, transparent 42%, rgba(22, 14, 10, 0.32) 100%)",
          "linear-gradient(95deg, rgba(32, 20, 16, 0.4) 0%, transparent 48%, rgba(68, 48, 38, 0.22) 100%)",
          "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(78, 56, 44, 0.14), transparent 55%)",
        ].join(", "),
        boxShadow:
          "inset 0 2px 12px rgba(0, 0, 0, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.045), inset 0 -2px 16px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.045] mix-blend-multiply"
        style={{
          backgroundImage: pitchSurroundNoiseDataUrl,
          backgroundSize: "200px 200px",
        }}
        aria-hidden
      />
      <div
        ref={hostRef}
        className={cn(
          "relative z-10 mx-auto min-h-0 w-full max-w-full overflow-hidden rounded-lg bg-transparent",
          className,
        )}
        style={{
          aspectRatio: getPitchBoardAspectRatio(sport),
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
        aria-label="Simulator pitch"
        role="img"
      />
    </div>
  );
});

SimulatorPixiSurface.displayName = "SimulatorPixiSurface";
