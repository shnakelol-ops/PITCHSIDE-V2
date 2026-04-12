"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";

import {
  getPitchBoardAspectRatio,
  type PitchSport,
} from "@/config/pitchConfig";
import { letterboxPitchWorld } from "@src/lib/pitch-coordinates";
import { mountGaelicPitchRenderer } from "@src/features/simulator/renderer/GaelicPitchRenderer";
import { mountPremiumPitchRenderer } from "@src/features/simulator/renderer/PremiumPitchRenderer";
import { createDefaultMicroAthletes } from "@src/features/simulator/model/micro-athlete";
import { MovementPathStore } from "@src/features/simulator/path/movement-path-store";
import { drawMovementPathsGraphics } from "@src/features/simulator/pixi/movement-path-graphics";
import { drawShadowRunsGraphics } from "@src/features/simulator/pixi/shadow-path-graphics";
import { drawShadowPlaybackGhosts } from "@src/features/simulator/pixi/shadow-playback-ghost";
import { mountAthletesPixi } from "@src/features/simulator/pixi/simulator-athletes-pixi";
import { SimulatorPlaybackController } from "@src/features/simulator/playback/simulator-playback-controller";
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

export type SimulatorPixiSurfaceProps = {
  sport: PitchSport;
  /** When true, draw on empty pitch records a path for the selected player (no playback). */
  recordingMode?: boolean;
  /** When true, draw records a secondary shadow path for the selected player. */
  shadowRecordingMode?: boolean;
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
  { sport, recordingMode = false, shadowRecordingMode = false, className },
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
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    app.renderer.resolution = dpr;
    app.renderer.resize(w, h);
    const { scale, offsetX, offsetY } = letterboxPitchWorld(w, h);
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

    void (async () => {
      const { Application, Container, Graphics } = await import("pixi.js");
      if (cancelled || !hostRef.current) return;

      const app = new Application();
      await app.init({
        width: host.clientWidth || 640,
        height: host.clientHeight || 400,
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

      attachPitch(sportRef.current);
      layout();

      const redrawPaths = () => {
        drawShadowRunsGraphics(shadowPathGraphics, pathStore.getAllShadowRuns());
        drawMovementPathsGraphics(pathGraphics, pathStore.getAllPaths());
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
        },
        updateShadowGhosts: (poses) => {
          drawShadowPlaybackGhosts(shadowGhostGraphics, poses);
        },
      });
      playbackControllerRef.current = playback;

      ro = new ResizeObserver(() => layout());
      ro.observe(host);
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
    if (!pitchHolderRef.current) return;
    attachPitch(sport);
    layout();
  }, [sport]);

  return (
    <div
      className="pitch-wrapper relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl p-3 sm:p-4 md:p-5"
      style={{
        backgroundColor: "#ebe4d4",
        backgroundImage: [
          "linear-gradient(175deg, rgba(255,252,245,0.55) 0%, transparent 42%, rgba(210,198,176,0.35) 100%)",
          "linear-gradient(95deg, rgba(196,188,168,0.22) 0%, transparent 48%, rgba(232,224,208,0.4) 100%)",
          "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(180,172,148,0.12), transparent 55%)",
        ].join(", "),
        boxShadow:
          "inset 0 2px 14px rgba(62, 54, 42, 0.08), inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 -3px 20px rgba(72, 64, 48, 0.06)",
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
