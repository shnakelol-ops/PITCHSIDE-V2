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
  /** Full-bleed mount path used by phone stats shell. */
  fullBleed?: boolean;
  className?: string;
};

type PixiApp = import("pixi.js").Application;
type PixiContainer = import("pixi.js").Container;

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
    fullBleed = false,
    className,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApp | null>(null);
  const worldRef = useRef<PixiContainer | null>(null);
  const pitchHolderRef = useRef<PixiContainer | null>(null);
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
  const fillParent = fullBleed;

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
    const container = host.parentElement ?? host;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    app.renderer.resolution = dpr;
    app.renderer.resize(w, h);
    const { scale, offsetX, offsetY } = letterboxPitchWorld(w, h);
    worldScaleRef.current = scale;
    world.scale.set(scale);
    world.position.set(offsetX, offsetY);
  };

  const attachPitch = (nextSport: PitchSport) => {
    pitchDisposeRef.current?.();
    pitchDisposeRef.current = null;
    const holder = pitchHolderRef.current;
    if (!holder) return;
    const { root, dispose } =
      nextSport === "gaelic" || nextSport === "hurling"
        ? mountGaelicPitchRenderer(nextSport)
        : mountPremiumPitchRenderer(nextSport);
    holder.removeChildren();
    holder.addChild(root);
    pitchDisposeRef.current = dispose;
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let unsubPaths: (() => void) | null = null;
    let redrawPaths: (() => void) | null = null;

    void (async () => {
      const { Application, Container, Graphics } = await import("pixi.js");
      if (cancelled || !hostRef.current) return;

      const app = new Application();
      const container = host.parentElement ?? host;
      await app.init({
        width: container.clientWidth || host.clientWidth || 640,
        height: container.clientHeight || host.clientHeight || 400,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, window.devicePixelRatio || 1),
      });

      if (cancelled) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      host.appendChild(app.canvas as HTMLCanvasElement);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      app.canvas.style.display = "block";
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

      attachPitch(sportRef.current);
      layout();

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
      ro.observe(container);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      ro = null;
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
    attachPitch(sport);
    layout();
  }, [sport]);

  if (fillParent) {
    return (
      <div
        ref={hostRef}
        className={cn(
          "absolute inset-0 h-full w-full min-h-0 overflow-hidden bg-transparent",
          className,
        )}
        style={{
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
        aria-label="Simulator pitch"
        role="img"
      />
    );
  }

  return (
    <div
      className="pitch-wrapper relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-2xl p-3 sm:p-4 md:p-5"
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
          "relative z-10 mx-auto h-full min-h-0 w-full max-w-full overflow-hidden rounded-lg bg-transparent",
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
