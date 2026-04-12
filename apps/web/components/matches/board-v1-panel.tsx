"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MatchPeriod } from "@pitchside/data-access";

import { PitchCanvas } from "@/components/matches/pitch-canvas";
import { useMatchWorkspaceLiveOptional } from "@/components/matches/match-workspace-live-context";
import { Button } from "@/components/ui/button";
import {
  getPitchBoardAspectRatio,
  type PitchSport,
} from "@/config/pitchConfig";
import { boardContentSnapshot } from "@/lib/board-snapshot";
import {
  createDefaultBoardMarkers,
  type BoardMarkerState,
} from "@/lib/board-v1-defaults";
import {
  deriveBoardTapZones,
  resolveBoardTapPlayer,
} from "@/lib/board-log-tap";
import { boardChrome, boardMarkers } from "@/lib/board-tokens";
import { formatMatchPeriodLabel } from "@/lib/match-period-labels";
import { cn } from "@pitchside/utils";

export type BoardDrawingState = {
  id: string;
  kind: "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type DrawTool = "select" | "line" | "arrow";

type BoardSceneSummary = { id: string; name: string };

type BoardLoadResponse = {
  sceneId: string;
  scenes: BoardSceneSummary[];
  markers: BoardMarkerState[];
  drawings: BoardDrawingState[];
};

type DraftDraw = {
  kind: "line" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

type DragRef = {
  id: string;
  offsetX: number;
  offsetY: number;
} | null;

const DRAW_MIN_LEN2 = 1e-6;

const BOARD_PITCH_OPTIONS: { id: PitchSport; label: string }[] = [
  { id: "soccer", label: "Soccer" },
  { id: "gaelic", label: "Gaelic football" },
  { id: "hurling", label: "Hurling" },
];

type BoardV1PanelProps = {
  matchId: string;
  /** Coach workspace: live events / KPI (must stay under the same live provider as the board). */
  rightPanel?: ReactNode;
  /** Optional override for the left rail; default draws Select/Line/Arrow/Erase + squad controls. */
  leftPanel?: ReactNode | null;
};

export function BoardV1Panel({
  matchId,
  rightPanel,
  leftPanel,
}: BoardV1PanelProps) {
  const coachWorkspace = rightPanel != null;
  const live = useMatchWorkspaceLiveOptional();
  const [pitchSportFallback, setPitchSportFallback] =
    useState<PitchSport>("gaelic");
  const pitchSport = live?.boardPitchSport ?? pitchSportFallback;
  const setPitchSport = live?.setBoardPitchSport ?? setPitchSportFallback;

  const pitchAspectRatio = useMemo(
    () => getPitchBoardAspectRatio(pitchSport),
    [pitchSport],
  );

  const pitchBezelClass = useMemo(
    () =>
      pitchSport === "soccer"
        ? boardChrome.bezelSoccer
        : boardChrome.bezelGaa,
    [pitchSport],
  );

  const panelShellClass = useMemo(
    () =>
      pitchSport === "soccer"
        ? boardChrome.shellSoccer
        : boardChrome.shellGaa,
    [pitchSport],
  );

  /** Inset ring only for non-run-of-play phases — no change during 1st/2nd half. */
  const phaseAccentRing = useMemo(() => {
    if (!live) return null;
    const p = live.period;
    if (p === MatchPeriod.HALF_TIME || p === MatchPeriod.FULL_TIME) {
      return "ring-amber-400/55";
    }
    if (p === MatchPeriod.WARMUP) {
      return "ring-slate-400/35";
    }
    if (p === MatchPeriod.PENALTIES) {
      return "ring-rose-400/45";
    }
    if (
      p === MatchPeriod.EXTRA_TIME_FIRST ||
      p === MatchPeriod.EXTRA_TIME_SECOND
    ) {
      return "ring-violet-400/40";
    }
    return null;
  }, [live]);

  const pitchRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragRef>(null);
  const dragDraftRef = useRef<DraftDraw | null>(null);

  const [markers, setMarkers] = useState<BoardMarkerState[]>([]);
  const [drawings, setDrawings] = useState<BoardDrawingState[]>([]);
  const [draftDraw, setDraftDraw] = useState<DraftDraw | null>(null);
  const [activeTool, setActiveTool] = useState<DrawTool>("select");
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(
    null,
  );

  const [scenes, setScenes] = useState<BoardSceneSummary[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [sceneSwitching, setSceneSwitching] = useState(false);
  const [creatingScene, setCreatingScene] = useState(false);

  const [loading, setLoading] = useState(true);
  const [reloadBusy, setReloadBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [logPickMarkerId, setLogPickMarkerId] = useState<string | null>(null);
  const logPickFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitBoardFromServer = useCallback((data: BoardLoadResponse) => {
    dragRef.current = null;
    dragDraftRef.current = null;
    setDraftDraw(null);
    setActiveTool("select");
    setSelectedMarkerId(null);
    setSelectedDrawingId(null);

    const nextDrawings = data.drawings ?? [];
    const nextMarkers = data.markers;

    setScenes(data.scenes);
    setActiveSceneId(data.sceneId);
    setDrawings(nextDrawings);
    setMarkers(nextMarkers);
    setSavedSnapshot(boardContentSnapshot(nextMarkers, nextDrawings));
  }, []);

  const fetchBoardPayload = useCallback(
    async (
      sceneId: string | null,
    ): Promise<
      | { ok: true; data: BoardLoadResponse }
      | { ok: false; errorMessage: string }
    > => {
      const q =
        sceneId !== null && sceneId.length > 0
          ? `?sceneId=${encodeURIComponent(sceneId)}`
          : "";
      const res = await fetch(`/api/matches/${matchId}/board${q}`, {
        cache: "no-store",
      });
      const json: unknown = await res.json();

      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        return {
          ok: false,
          errorMessage: err.error?.message ?? "Failed to load board.",
        };
      }

      const body = json as { data?: BoardLoadResponse };
      if (!body.data) {
        return { ok: false, errorMessage: "Invalid response from server." };
      }

      return { ok: true, data: body.data };
    },
    [matchId],
  );

  const loadBoard = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchBoardPayload(null);
      if (!result.ok) {
        setError(
          `Couldn’t load the board. ${result.errorMessage} You can still edit locally; try saving once you’re back online.`,
        );
        const fb = createDefaultBoardMarkers(pitchSport);
        setScenes([]);
        setActiveSceneId(null);
        setMarkers(fb);
        setDrawings([]);
        setSavedSnapshot(boardContentSnapshot(fb, []));
        return;
      }
      commitBoardFromServer(result.data);
    } finally {
      setLoading(false);
    }
  }, [commitBoardFromServer, fetchBoardPayload, pitchSport]);

  const reloadScene = useCallback(async () => {
    setError(null);
    setMessage(null);
    if (!activeSceneId) {
      setError("No scene loaded to reload.");
      return;
    }
    setReloadBusy(true);
    try {
      const result = await fetchBoardPayload(activeSceneId);
      if (!result.ok) {
        setError(
          `Couldn’t reload the board. ${result.errorMessage} Your on-screen board was left unchanged.`,
        );
        return;
      }
      commitBoardFromServer(result.data);
      setMessage("Scene loaded");
      window.setTimeout(() => setMessage(null), 2000);
    } finally {
      setReloadBusy(false);
    }
  }, [activeSceneId, commitBoardFromServer, fetchBoardPayload]);

  const switchToScene = useCallback(
    async (sceneId: string) => {
      if (sceneId === activeSceneId) return;
      setError(null);
      setMessage(null);
      setSceneSwitching(true);
      try {
        const result = await fetchBoardPayload(sceneId);
        if (!result.ok) {
          setError(
            `Couldn’t switch scene. ${result.errorMessage} Your current board was left unchanged.`,
          );
          return;
        }
        commitBoardFromServer(result.data);
      } finally {
        setSceneSwitching(false);
      }
    },
    [activeSceneId, commitBoardFromServer, fetchBoardPayload],
  );

  const createNewScene = useCallback(async () => {
    if (!activeSceneId || creatingScene || sceneSwitching) return;
    setCreatingScene(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        sourceSceneId: activeSceneId,
        markers: markers.map(({ id: _id, ...rest }) => rest),
        drawings: drawings.map(({ id: _id, ...rest }) => rest),
      };
      const res = await fetch(`/api/matches/${matchId}/board`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json();

      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        setError(
          err.error?.message
            ? `Couldn’t create scene. ${err.error.message}`
            : "Couldn’t create a new scene. Try again.",
        );
        return;
      }

      const ok = json as { data?: BoardLoadResponse };
      if (ok.data) {
        commitBoardFromServer(ok.data);
        setMessage("New scene created");
        window.setTimeout(() => setMessage(null), 2000);
      }
    } finally {
      setCreatingScene(false);
    }
  }, [
    activeSceneId,
    commitBoardFromServer,
    creatingScene,
    drawings,
    markers,
    matchId,
    sceneSwitching,
  ]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    return () => {
      if (logPickFlashRef.current != null) {
        clearTimeout(logPickFlashRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPresentMode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isPresentMode]);

  const currentSnapshot = useMemo(
    () => boardContentSnapshot(markers, drawings),
    [markers, drawings],
  );

  const hasUnsavedChanges =
    !loading && savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  const normFromClient = useCallback((clientX: number, clientY: number) => {
    const el = pitchRef.current;
    if (!el) return { x: 0.5, y: 0.5 };
    const r = el.getBoundingClientRect();
    return {
      x: clamp01((clientX - r.left) / r.width),
      y: clamp01((clientY - r.top) / r.height),
    };
  }, []);

  /** Normalised 0–1 in stored board space (length on x, width on y — same mapping for all pitch sports). */
  const boardNormFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const { x: nx, y: ny } = normFromClient(clientX, clientY);
      return { x: nx, y: ny };
    },
    [normFromClient],
  );

  const onPointerDownMarker = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedMarkerId(id);
      setSelectedDrawingId(null);
      const { x: nx, y: ny } = boardNormFromClient(e.clientX, e.clientY);
      const m = markers.find((k) => k.id === id);
      if (!m) return;
      dragRef.current = {
        id,
        offsetX: nx - m.x,
        offsetY: ny - m.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [markers, boardNormFromClient],
  );

  const onPointerMoveMarker = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || e.buttons !== 1) return;
      const { id, offsetX, offsetY } = dragRef.current;
      const { x: nx, y: ny } = boardNormFromClient(e.clientX, e.clientY);
      setMarkers((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                x: clamp01(nx - offsetX),
                y: clamp01(ny - offsetY),
              }
            : m,
        ),
      );
    },
    [boardNormFromClient],
  );

  const onPointerUpMarker = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
  }, []);

  const onDrawLayerBgPointerDown = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (activeTool === "select") {
        setSelectedMarkerId(null);
        setSelectedDrawingId(null);
        if (live && !(loading || sceneSwitching)) {
          const p = boardNormFromClient(e.clientX, e.clientY);
          const { third, lane, side } = deriveBoardTapZones(p.x, p.y);
          const { playerId, markerId } = resolveBoardTapPlayer(
            markers,
            p.x,
            p.y,
            live.players,
          );
          live.applyBoardLogPick({
            x: p.x,
            y: p.y,
            third,
            lane,
            side,
            playerId,
          });
          setLogPickMarkerId(markerId);
          if (logPickFlashRef.current != null) {
            clearTimeout(logPickFlashRef.current);
          }
          logPickFlashRef.current = setTimeout(() => {
            setLogPickMarkerId(null);
            logPickFlashRef.current = null;
          }, 1600);
        }
        return;
      }

      if (activeTool === "line" || activeTool === "arrow") {
        e.preventDefault();
        const p = boardNormFromClient(e.clientX, e.clientY);
        const kind: DraftDraw["kind"] =
          activeTool === "arrow" ? "arrow" : "line";
        const start: DraftDraw = {
          kind,
          x1: p.x,
          y1: p.y,
          x2: p.x,
          y2: p.y,
        };
        dragDraftRef.current = start;
        setDraftDraw(start);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [activeTool, boardNormFromClient, live, markers, loading, sceneSwitching],
  );

  const onDrawLayerBgPointerMove = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      if (!dragDraftRef.current) return;
      const p = boardNormFromClient(e.clientX, e.clientY);
      const next = {
        ...dragDraftRef.current,
        x2: p.x,
        y2: p.y,
      };
      dragDraftRef.current = next;
      setDraftDraw(next);
    },
    [boardNormFromClient],
  );

  const onDrawLayerBgPointerUp = useCallback(
    (e: React.PointerEvent<SVGRectElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const d = dragDraftRef.current;
      dragDraftRef.current = null;
      setDraftDraw(null);

      if (!d) return;

      const { x1, y1, x2, y2, kind } = d;
      const dx = x2 - x1;
      const dy = y2 - y1;
      if (dx * dx + dy * dy < DRAW_MIN_LEN2) return;

      setDrawings((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind,
          x1,
          y1,
          x2,
          y2,
        },
      ]);
    },
    [],
  );

  const onDrawingShapePointerDown = useCallback(
    (e: React.PointerEvent, drawingId: string) => {
      e.stopPropagation();
      if (activeTool !== "select") return;
      setSelectedDrawingId(drawingId);
      setSelectedMarkerId(null);
    },
    [activeTool],
  );

  const saveScene = async (opts?: {
    markers?: BoardMarkerState[];
    successMessage?: string;
    errorPrefix?: string;
  }) => {
    if (saving || !activeSceneId) return;
    const markersForPut = opts?.markers ?? markers;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const body = {
        sceneId: activeSceneId,
        markers: markersForPut.map(({ id: _id, ...rest }) => rest),
        drawings: drawings.map(({ id: _id, ...rest }) => rest),
      };
      const res = await fetch(`/api/matches/${matchId}/board`, {
        method: "PUT",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json();

      if (!res.ok) {
        const err = json as { error?: { message?: string } };
        if (opts?.errorPrefix) {
          setError(
            err.error?.message
              ? `${opts.errorPrefix} ${err.error.message}`
              : `${opts.errorPrefix} Check your connection and try again.`,
          );
        } else {
          setError(
            err.error?.message
              ? `Couldn’t save. ${err.error.message}`
              : "Couldn’t save the board. Check your connection and try again.",
          );
        }
        return;
      }

      const ok = json as { data?: BoardLoadResponse };
      if (ok.data) {
        commitBoardFromServer(ok.data);
      }
      setMessage(opts?.successMessage ?? "Saved ✔");
      window.setTimeout(() => setMessage(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const resetLayout = async () => {
    dragRef.current = null;
    dragDraftRef.current = null;
    setError(null);
    setMessage(null);
    const nextMarkers = createDefaultBoardMarkers(pitchSport);
    setMarkers(nextMarkers);
    setSelectedMarkerId(null);
    setDraftDraw(null);

    if (!activeSceneId) {
      setSavedSnapshot(boardContentSnapshot(nextMarkers, drawings));
      setMessage("Layout reset");
      window.setTimeout(() => setMessage(null), 2000);
      return;
    }

    await saveScene({
      markers: nextMarkers,
      successMessage: "Layout reset · saved",
      errorPrefix: "Couldn’t save reset layout.",
    });
  };

  const addMarker = () => {
    const nextNum =
      markers.reduce((max, m) => {
        const n = parseInt(m.label, 10);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0) + 1;
    const teamSide = nextNum % 2 === 0 ? "AWAY" : "HOME";
    const newMarker: BoardMarkerState = {
      id: crypto.randomUUID(),
      x: clamp01(0.5 + (markers.length % 5) * 0.02),
      y: clamp01(0.5 + (markers.length % 3) * 0.02),
      label: String(nextNum),
      teamSide,
    };
    setMarkers((prev) => [...prev, newMarker]);
    setSelectedMarkerId(newMarker.id);
    setSelectedDrawingId(null);
  };

  const removeSelectedMarker = () => {
    if (!selectedMarkerId) return;
    setMarkers((prev) => prev.filter((m) => m.id !== selectedMarkerId));
    setSelectedMarkerId(null);
  };

  const eraseSelectedDrawing = () => {
    if (!selectedDrawingId) return;
    setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId));
    setSelectedDrawingId(null);
  };

  const clearDrawings = () => {
    dragDraftRef.current = null;
    setDraftDraw(null);
    setDrawings([]);
    setSelectedDrawingId(null);
    setMessage("Drawings cleared");
    window.setTimeout(() => setMessage(null), 2000);
  };

  const controlBtnClass =
    "min-h-[2.75rem] rounded-full border border-slate-200/95 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-slate-800 shadow-sm transition duration-200 ease-out hover:border-pitchside-300/50 hover:bg-slate-50 hover:shadow-md hover:shadow-pitchside-900/[0.06] hover:ring-1 hover:ring-pitchside-500/15 active:scale-[0.96] disabled:opacity-50 disabled:hover:shadow-none disabled:hover:ring-0 sm:min-h-[2.5rem] dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-pitchside-500/35 dark:hover:bg-slate-800 dark:hover:shadow-pitchside-400/10 dark:hover:ring-pitchside-400/20";

  const drawToolBtnClass =
    `${controlBtnClass} uppercase tracking-wider`;

  const sceneOutlineBtnClass =
    "min-h-[2.75rem] rounded-full border-2 border-slate-200/95 bg-gradient-to-b from-slate-50 to-white px-4 py-2 text-xs font-semibold tracking-wide text-slate-700 shadow-sm transition duration-200 ease-out hover:border-pitchside-400/55 hover:bg-white hover:shadow-md hover:shadow-pitchside-900/[0.05] hover:ring-1 hover:ring-pitchside-500/20 active:scale-[0.96] sm:min-h-[2.5rem] dark:border-slate-600 dark:from-slate-800/80 dark:to-slate-900 dark:text-slate-200 dark:hover:border-pitchside-500/45 dark:hover:ring-pitchside-400/25";

  const saveSceneBtnClass =
    "min-h-[3rem] min-w-[10rem] rounded-full bg-gradient-to-b from-pitchside-500 to-pitchside-700 px-7 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_4px_0_0_rgb(4,120,87),0_12px_36px_-8px_rgba(5,150,105,0.55),0_2px_12px_-2px_rgba(5,150,105,0.4),inset_0_1px_0_rgba(255,255,255,0.22)] transition duration-200 ease-out hover:from-pitchside-500 hover:to-pitchside-600 hover:shadow-[0_4px_0_0_rgb(4,120,87),0_16px_44px_-8px_rgba(5,150,105,0.5),inset_0_1px_0_rgba(255,255,255,0.28)] hover:ring-2 hover:ring-pitchside-300/50 active:translate-y-0.5 active:scale-[0.97] active:shadow-[0_2px_0_0_rgb(4,120,87),0_8px_24px_-6px_rgba(5,150,105,0.45)] disabled:translate-y-0 disabled:shadow-none disabled:hover:ring-0 dark:shadow-[0_4px_0_0_rgb(6,95,70),0_12px_40px_-8px_rgba(5,150,105,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]";

  const toolActiveClass =
    "border-pitchside-500 bg-pitchside-50 shadow-md shadow-pitchside-500/15 ring-2 ring-pitchside-500/35 ring-offset-2 ring-offset-white dark:border-pitchside-400 dark:bg-pitchside-950/60 dark:shadow-pitchside-400/20 dark:ring-pitchside-400/45 dark:ring-offset-slate-950";

  const dockLabelClass =
    "mb-3 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400";

  const toolGroupClass =
    "rounded-[1.125rem] border border-slate-200/85 bg-gradient-to-b from-slate-50/98 via-white to-slate-50/40 p-4 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.1),0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-900/[0.04] transition-shadow duration-200 dark:border-slate-700/90 dark:from-slate-900/92 dark:via-slate-950 dark:to-slate-900/80 dark:shadow-[0_10px_32px_-14px_rgba(0,0,0,0.5)] dark:ring-white/[0.05]";

  const boardBusy =
    loading || reloadBusy || sceneSwitching || creatingScene;
  const pitchBlocking = loading || sceneSwitching;

  const pitchCanvasEmpty =
    !pitchBlocking &&
    markers.length === 0 &&
    drawings.length === 0 &&
    draftDraw === null;

  const sceneSelectClass =
    "min-h-[2.75rem] min-w-[10rem] rounded-full border border-slate-200/95 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm outline-none transition duration-200 focus-visible:border-pitchside-500 focus-visible:ring-2 focus-visible:ring-pitchside-500/30 hover:border-slate-300 hover:shadow-md sm:min-h-[2.5rem] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500";

  const renderDrawingLine = (d: BoardDrawingState | DraftDraw, key: string) => {
    const sel = "id" in d && d.id === selectedDrawingId;
    const x1 = d.x1 * 100;
    const y1 = d.y1 * 100;
    const x2 = d.x2 * 100;
    const y2 = d.y2 * 100;
    const isArrow = d.kind === "arrow";
    const isDraft = !("id" in d);

    const arrowMarker = isArrow
      ? isDraft
        ? "url(#boardV1ArrowDraft)"
        : sel
          ? "url(#boardV1ArrowSel)"
          : "url(#boardV1Arrow)"
      : undefined;

    return (
      <g key={key}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="transparent"
          strokeWidth={14}
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: "stroke", cursor: "pointer" }}
          onPointerDown={(e) => {
            if (!isDraft && "id" in d) {
              onDrawingShapePointerDown(e, d.id);
            }
          }}
        />
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={
            isDraft
              ? "rgba(253, 224, 71, 0.95)"
              : sel
                ? "rgb(52 211 153)"
                : "rgba(255,255,255,0.92)"
          }
          strokeWidth={isDraft ? 2 : sel ? 5.2 : 2.6}
          strokeDasharray={isDraft ? "4 3" : undefined}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          markerEnd={arrowMarker}
          style={{
            pointerEvents: "none",
            filter: sel
              ? "drop-shadow(0 0 5px rgb(52 211 153)) drop-shadow(0 0 2px rgb(255 255 255))"
              : undefined,
          }}
        />
      </g>
    );
  };

  const drawToolColumnClass =
    "flex w-full flex-col items-stretch gap-1 px-0.5 py-1";

  const renderPitchSurface = (centerMaxClass?: string) => (
    <div
      className={cn(
        pitchBezelClass,
        centerMaxClass,
        isPresentMode &&
          "flex flex-1 items-center justify-center rounded-none bg-transparent p-0 shadow-none ring-0",
      )}
    >
      <div
        ref={pitchRef}
        role="presentation"
        aria-busy={pitchBlocking}
        aria-label="Tactical pitch"
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border-[3px] border-pitchside-950/70 bg-emerald-950 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.18),inset_0_2px_0_rgba(255,255,255,0.12),inset_0_-24px_64px_rgba(0,0,0,0.28)] dark:border-emerald-400/18 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),inset_0_-28px_72px_rgba(0,0,0,0.38)]",
          activeTool === "line" || activeTool === "arrow"
            ? "cursor-crosshair"
            : "cursor-default",
          pitchBlocking && "pointer-events-none",
        )}
        style={{ aspectRatio: pitchAspectRatio }}
      >
          {pitchBlocking ? (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-emerald-950/85 via-emerald-950/75 to-emerald-950/90 px-6 backdrop-blur-[3px]">
              <div
                className="relative h-14 w-14"
                role="status"
                aria-label={loading ? "Loading board" : "Loading scene"}
              >
                <div className="absolute inset-0 rounded-full border-2 border-white/15" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white border-r-white/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/90">
                  {loading ? "Loading board" : "Switching scene"}
                </p>
                <p className="mt-2 max-w-[14rem] text-xs leading-relaxed text-white/55">
                  {loading
                    ? "Syncing your tactical data from the server."
                    : "Pulling the selected scene — your other scenes stay saved."}
                </p>
              </div>
            </div>
          ) : null}
          {pitchCanvasEmpty ? (
            <div
              className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center p-6"
              aria-hidden
            >
              <div className="max-w-[17rem] rounded-2xl border border-white/15 bg-emerald-950/45 px-5 py-4 text-center shadow-[0_16px_48px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur-[2px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                  Empty canvas
                </p>
                <p className="mt-2 text-sm font-semibold text-white/92">
                  No markers or lines yet
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/58">
                  Add markers or draw with{" "}
                  <span className="font-semibold text-white/80">Line</span> /{" "}
                  <span className="font-semibold text-white/80">Arrow</span>.
                </p>
              </div>
            </div>
          ) : null}
            <PitchCanvas
              key={pitchSport}
              sport={pitchSport}
              pitchHighlight={live?.pitchHighlight ?? null}
            />

            {phaseAccentRing ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 z-[1] rounded-2xl ring-2 ring-inset",
                  phaseAccentRing,
                )}
                aria-hidden
              />
            ) : null}

            <svg
              className="absolute inset-0 z-[2] h-full w-full touch-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <marker
                  id="boardV1Arrow"
                  markerWidth="5"
                  markerHeight="5"
                  refX="4.2"
                  refY="2.5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <polygon
                    points="0 0, 5 2.5, 0 5"
                    fill="rgba(255,255,255,0.92)"
                  />
                </marker>
                <marker
                  id="boardV1ArrowSel"
                  markerWidth="5"
                  markerHeight="5"
                  refX="4.2"
                  refY="2.5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <polygon points="0 0, 5 2.5, 0 5" fill="rgb(52 211 153)" />
                </marker>
                <marker
                  id="boardV1ArrowDraft"
                  markerWidth="5"
                  markerHeight="5"
                  refX="4.2"
                  refY="2.5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <polygon
                    points="0 0, 5 2.5, 0 5"
                    fill="rgba(253, 224, 71, 0.95)"
                  />
                </marker>
              </defs>
              <rect
                data-draw-hit-bg
                width="100"
                height="100"
                fill="transparent"
                onPointerDown={onDrawLayerBgPointerDown}
                onPointerMove={onDrawLayerBgPointerMove}
                onPointerUp={onDrawLayerBgPointerUp}
                onPointerCancel={onDrawLayerBgPointerUp}
              />
              {drawings.map((d) => renderDrawingLine(d, d.id))}
              {draftDraw ? renderDrawingLine(draftDraw, "draft") : null}
            </svg>

            {markers.map((m) => {
              const isHome = m.teamSide === "HOME";
              const isAway = m.teamSide === "AWAY";
              const selected = m.id === selectedMarkerId;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={cn(
                    boardMarkers.base,
                    isHome && boardMarkers.home,
                    isAway && boardMarkers.away,
                    !isHome && !isAway && boardMarkers.neutral,
                    selected && boardMarkers.selected,
                    logPickMarkerId === m.id &&
                      "z-[3] ring-2 ring-amber-400 ring-offset-2 ring-offset-emerald-950",
                  )}
                  style={{
                    left: `${m.x * 100}%`,
                    top: `${m.y * 100}%`,
                  }}
                  onPointerDown={(e) => onPointerDownMarker(e, m.id)}
                  onPointerMove={onPointerMoveMarker}
                  onPointerUp={onPointerUpMarker}
                  onPointerCancel={onPointerUpMarker}
                  aria-label={`Player marker ${m.label}, ${m.teamSide}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
  );

  const defaultLeftRail = (
    <>
      <p className={dockLabelClass}>Draw</p>
      <div className={drawToolColumnClass}>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            drawToolBtnClass,
            "min-h-7 px-0.5 text-[8px] font-bold leading-tight",
            activeTool === "select" && toolActiveClass,
          )}
          disabled={boardBusy}
          onClick={() => {
            setActiveTool("select");
            setDraftDraw(null);
          }}
        >
          Select
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            drawToolBtnClass,
            "min-h-7 px-0.5 text-[8px] font-bold leading-tight",
            activeTool === "line" && toolActiveClass,
          )}
          disabled={boardBusy}
          onClick={() => {
            setActiveTool("line");
            setDraftDraw(null);
          }}
        >
          Line
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            drawToolBtnClass,
            "min-h-7 px-0.5 text-[8px] font-bold leading-tight",
            activeTool === "arrow" && toolActiveClass,
          )}
          disabled={boardBusy}
          onClick={() => {
            setActiveTool("arrow");
            setDraftDraw(null);
          }}
        >
          Arrow
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn(drawToolBtnClass, "min-h-7 px-0.5 text-[8px] font-bold leading-tight")}
          disabled={boardBusy || !selectedDrawingId}
          onClick={eraseSelectedDrawing}
        >
          Erase
        </Button>
      </div>
      {live ? (
        <p className="mt-1.5 max-w-[4.5rem] text-[8px] leading-snug text-slate-600 dark:text-slate-400">
          Select + tap pitch to arm the next event.
        </p>
      ) : null}
      <p className={cn(dockLabelClass, "mt-3")}>Squad</p>
      <div className={drawToolColumnClass}>
        <Button
          type="button"
          variant="secondary"
          className={cn(controlBtnClass, "min-h-7 px-0.5 text-[8px] font-bold")}
          disabled={boardBusy || markers.length >= 40}
          onClick={addMarker}
        >
          Add
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn(controlBtnClass, "min-h-7 px-0.5 text-[8px] font-bold")}
          disabled={boardBusy || !selectedMarkerId}
          onClick={removeSelectedMarker}
        >
          Remove
        </Button>
      </div>
    </>
  );

  const bottomSceneBar = (
    <div className="flex h-full min-w-0 flex-nowrap items-center justify-center gap-1.5 px-1 sm:gap-2 sm:px-3">
      <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-600 dark:text-slate-400">
        {markers.length}p · {drawings.length}L
      </span>
      <label htmlFor="board-scene" className="sr-only">
        Scene
      </label>
      <select
        id="board-scene"
        className={cn(sceneSelectClass, "h-9 min-w-[6.5rem] max-w-[9rem] shrink text-[10px]")}
        value={activeSceneId ?? ""}
        disabled={boardBusy || scenes.length === 0}
        onChange={(e) => void switchToScene(e.target.value)}
      >
        {scenes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="secondary"
        className={cn(sceneOutlineBtnClass, "h-9 shrink-0 px-2 text-[10px]")}
        disabled={boardBusy || !activeSceneId}
        onClick={() => void createNewScene()}
      >
        {creatingScene ? "…" : "+ New"}
      </Button>
      <Button
        type="button"
        variant="primary"
        className={cn(saveSceneBtnClass, "h-9 shrink-0 px-3 text-[10px]")}
        disabled={saving || boardBusy || !activeSceneId}
        aria-busy={saving}
        aria-label={saving ? "Saving board" : "Save scene"}
        onClick={() => void saveScene()}
      >
        {saving ? "…" : "Save scene"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className={cn(sceneOutlineBtnClass, "h-9 shrink-0 px-2 text-[10px]")}
        disabled={boardBusy || !activeSceneId}
        aria-busy={reloadBusy}
        onClick={() => void reloadScene()}
      >
        {reloadBusy ? "…" : "Reload"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className={cn(sceneOutlineBtnClass, "h-9 shrink-0 px-2 text-[10px]")}
        disabled={boardBusy || drawings.length === 0}
        onClick={clearDrawings}
      >
        Clear
      </Button>
      <Button
        type="button"
        variant="secondary"
        className={cn(sceneOutlineBtnClass, "h-9 shrink-0 px-2 text-[10px]")}
        disabled={boardBusy || saving}
        onClick={() => void resetLayout()}
      >
        Reset Layout
      </Button>
    </div>
  );

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-[1.25rem] border ring-1",
        panelShellClass,
        coachWorkspace && !isPresentMode && "flex h-full min-h-0 flex-col",
        isPresentMode &&
          "fixed inset-0 z-[90] rounded-none border-0 bg-slate-950 shadow-none ring-0 dark:border-0",
      )}
    >
      {isPresentMode ? (
        <div className="relative z-20 flex items-center justify-between border-b border-white/15 px-4 py-3 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
            Presentation mode
          </p>
          <Button
            type="button"
            variant="secondary"
            className={controlBtnClass}
            onClick={() => setIsPresentMode(false)}
          >
            Exit
          </Button>
        </div>
      ) : coachWorkspace ? null : (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-pitchside-500/[0.13] via-pitchside-600/[0.04] to-transparent dark:from-pitchside-400/[0.14] dark:via-pitchside-600/[0.06]"
            aria-hidden
          />

          <div className="relative border-b border-slate-100/95 px-5 pb-6 pt-7 dark:border-slate-800/80 sm:px-7 sm:pt-8 lg:px-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="mt-1 hidden h-[4.25rem] w-1.5 shrink-0 rounded-full bg-gradient-to-b from-pitchside-400 via-pitchside-600 to-pitchside-800 shadow-[0_0_28px_rgba(52,211,153,0.35)] sm:block"
                  aria-hidden
                />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    Tactical workspace
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl sm:leading-[1.1]">
                    Pitch canvas
                  </h2>
                  <p className="pt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Primary surface · scenes persist when you save
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className={controlBtnClass}
                  onClick={() => setIsPresentMode(true)}
                >
                  Present Mode
                </Button>
                {hasUnsavedChanges ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-amber-400/50 bg-amber-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-900 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/90 dark:text-amber-100">
                    Unsaved changes
                  </span>
                ) : null}
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-5 rounded-[1.125rem] border border-red-200/90 bg-gradient-to-br from-red-50 to-red-50/70 px-4 py-3 text-sm leading-snug text-red-800 shadow-sm dark:border-red-900/55 dark:from-red-950/50 dark:to-red-950/30 dark:text-red-100"
              >
                {error}
              </div>
            ) : null}
            {message ? (
              <div
                role="status"
                className="mt-5 rounded-[1.125rem] border border-pitchside-200/90 bg-gradient-to-br from-pitchside-50 to-emerald-50/50 px-4 py-3 text-sm font-medium text-pitchside-900 shadow-sm dark:border-pitchside-800 dark:from-pitchside-950/55 dark:to-emerald-950/30 dark:text-pitchside-100"
              >
                {message}
              </div>
            ) : null}
          </div>
        </>
      )}

      <div
        className={cn(
          "relative mx-auto min-h-0 w-full",
          coachWorkspace && !isPresentMode
            ? "flex flex-1 min-h-0 flex-col overflow-hidden px-0 pb-0"
            : "px-3 pb-3 sm:px-5 sm:pb-6 lg:px-7",
          isPresentMode && "flex h-[calc(100vh-4.5rem)] flex-col px-0 pb-0 sm:px-0",
        )}
      >
        {!isPresentMode && coachWorkspace ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {error ? (
              <div
                role="alert"
                className="relative z-10 mx-2 mt-2 shrink-0 rounded-lg border border-red-200/90 bg-red-50/95 px-2 py-1.5 text-xs text-red-800 dark:border-red-900/55 dark:bg-red-950/50 dark:text-red-100"
              >
                {error}
              </div>
            ) : null}
            {message ? (
              <div
                role="status"
                className="relative z-10 mx-2 mt-2 shrink-0 rounded-lg border border-pitchside-200/90 bg-pitchside-50/95 px-2 py-1.5 text-xs text-pitchside-900 dark:border-pitchside-800 dark:bg-pitchside-950/50 dark:text-pitchside-100"
              >
                {message}
              </div>
            ) : null}
            <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-2 py-1.5 dark:border-slate-700/80">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(controlBtnClass, "h-8 shrink-0 px-2 text-[10px]")}
                  onClick={() => setIsPresentMode(true)}
                >
                  Present
                </Button>
                {hasUnsavedChanges ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-amber-400/50 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/90 dark:text-amber-100">
                    Unsaved
                  </span>
                ) : null}
              </div>
              <div
                role="group"
                aria-label="Pitch sport"
                className="flex shrink-0 flex-wrap items-center justify-end gap-1"
              >
                {BOARD_PITCH_OPTIONS.map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    variant="secondary"
                    disabled={boardBusy}
                    className={cn(
                      drawToolBtnClass,
                      "h-8 px-2 py-0.5 text-[9px]",
                      pitchSport === opt.id && toolActiveClass,
                    )}
                    onClick={() => setPitchSport(opt.id)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            {live ? (
              <div className="relative z-10 shrink-0 border-b border-slate-200/80 px-2 py-1 dark:border-slate-700/80">
                {live.sceneSuggestion ? (
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-1 rounded border border-pitchside-200/80 bg-pitchside-50/90 px-2 py-1 dark:border-pitchside-800/60 dark:bg-pitchside-950/40">
                    <p className="min-w-0 text-[9px] font-semibold text-pitchside-900 dark:text-pitchside-100">
                      {live.sceneSuggestion.title}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 shrink-0 px-2 text-[9px]"
                      onClick={live.dismissSceneSuggestion}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}
                <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] sm:grid-cols-4">
                  <div>
                    <dt className="font-semibold text-slate-500 dark:text-slate-400">
                      Phase
                    </dt>
                    <dd className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatMatchPeriodLabel(live.period)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500 dark:text-slate-400">
                      Score
                    </dt>
                    <dd className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {live.scoreGoalsPoints ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500 dark:text-slate-400">
                      Clock
                    </dt>
                    <dd className="font-mono text-[11px] font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {live.clockDisplay}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-slate-500 dark:text-slate-400">
                      Last
                    </dt>
                    <dd
                      className="truncate font-semibold text-slate-900 dark:text-slate-100"
                      title={live.lastEventSummary ?? undefined}
                    >
                      {live.lastEventSummary ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
            <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
              <aside className="relative z-10 flex w-full shrink-0 flex-row flex-wrap items-center justify-center gap-1 border-b border-slate-200/80 py-1 lg:w-[80px] lg:flex-col lg:flex-nowrap lg:items-stretch lg:justify-start lg:border-b-0 lg:border-r lg:py-2 dark:border-slate-700/80">
                {leftPanel ?? defaultLeftRail}
              </aside>
              <div className="relative z-0 flex-1 min-h-0 min-w-0">
                <div className="flex h-full w-full min-h-0 items-center justify-center p-1 sm:p-2">
                  {renderPitchSurface("max-h-full max-w-full")}
                </div>
              </div>
              <aside className="relative z-10 flex min-h-0 w-full min-w-0 shrink-0 flex-col border-t border-slate-200/80 lg:w-[260px] lg:border-l lg:border-t-0 dark:border-slate-700/80">
                <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                  {rightPanel}
                </div>
              </aside>
            </div>
            <div className="relative z-10 flex h-[64px] shrink-0 flex-col justify-center border-t border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-slate-950/90">
              {bottomSceneBar}
            </div>
          </div>
        ) : !isPresentMode ? (
          <>
            {live ? (
              <>
                <div className="mb-3 rounded-xl border border-slate-200/90 bg-white/85 px-3 py-2.5 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-[2px] dark:border-slate-700/80 dark:bg-slate-900/55 dark:ring-white/[0.04]">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Board · live context
                  </p>
                  <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Phase
                      </dt>
                      <dd className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatMatchPeriodLabel(live.period)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Score
                      </dt>
                      <dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {live.scoreGoalsPoints ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Clock
                      </dt>
                      <dd className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {live.clockDisplay}
                      </dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Last event
                      </dt>
                      <dd
                        className="truncate font-semibold text-slate-900 dark:text-slate-100"
                        title={live.lastEventSummary ?? undefined}
                      >
                        {live.lastEventSummary ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
                {live.sceneSuggestion ? (
                  <div className="mb-3 flex flex-col gap-2 rounded-xl border border-pitchside-200/90 bg-pitchside-50/90 px-3 py-2.5 dark:border-pitchside-800/80 dark:bg-pitchside-950/45 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-pitchside-800 dark:text-pitchside-300">
                        Scene idea · {live.sceneSuggestion.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                        {live.sceneSuggestion.hint}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className={cn(controlBtnClass, "min-h-[2.25rem] shrink-0 py-1.5")}
                      onClick={live.dismissSceneSuggestion}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="mb-3.5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-pitchside-700 dark:text-pitchside-400 sm:text-left">
                Live canvas
              </p>
              <div
                role="group"
                aria-label="Pitch sport"
                className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end"
              >
                {BOARD_PITCH_OPTIONS.map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    variant="secondary"
                    disabled={boardBusy}
                    className={cn(
                      drawToolBtnClass,
                      "min-h-[2rem] px-3 py-1.5 text-[10px]",
                      pitchSport === opt.id && toolActiveClass,
                    )}
                    onClick={() => setPitchSport(opt.id)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </>
        ) : null}
        {!isPresentMode && !coachWorkspace ? (
        <div className="mx-3 mt-7 sm:mx-5 lg:mx-8">
        <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
          Coaching control panel
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={toolGroupClass}>
            <p className={dockLabelClass}>Draw mode</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className={cn(
                  drawToolBtnClass,
                  activeTool === "select" && toolActiveClass,
                )}
                disabled={boardBusy}
                onClick={() => {
                  setActiveTool("select");
                  setDraftDraw(null);
                }}
              >
                Select
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(
                  drawToolBtnClass,
                  activeTool === "line" && toolActiveClass,
                )}
                disabled={boardBusy}
                onClick={() => {
                  setActiveTool("line");
                  setDraftDraw(null);
                }}
              >
                Line
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={cn(
                  drawToolBtnClass,
                  activeTool === "arrow" && toolActiveClass,
                )}
                disabled={boardBusy}
                onClick={() => {
                  setActiveTool("arrow");
                  setDraftDraw(null);
                }}
              >
                Arrow
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={drawToolBtnClass}
                disabled={boardBusy || !selectedDrawingId}
                onClick={eraseSelectedDrawing}
              >
                Erase
              </Button>
            </div>
            {live ? (
              <p className="mt-2 max-w-[22rem] text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                Select + tap the pitch surface to arm zone, lane, side, and nearest token for the next match-panel event.
              </p>
            ) : null}
          </div>

          <div className={toolGroupClass}>
            <p className={dockLabelClass}>Scenes &amp; save</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="board-scene" className="sr-only">
                  Scene
                </label>
                <select
                  id="board-scene"
                  className={cn(sceneSelectClass, "min-w-[9rem] flex-1")}
                  value={activeSceneId ?? ""}
                  disabled={boardBusy || scenes.length === 0}
                  onChange={(e) => void switchToScene(e.target.value)}
                >
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  className={controlBtnClass}
                  disabled={boardBusy || !activeSceneId}
                  onClick={() => void createNewScene()}
                >
                  {creatingScene ? "Creating…" : "+ New"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-3.5 dark:border-slate-600/70">
                <Button
                  type="button"
                  variant="primary"
                  className={cn(saveSceneBtnClass, "min-h-[2.75rem] flex-1 sm:flex-none")}
                  disabled={saving || boardBusy || !activeSceneId}
                  aria-busy={saving}
                  aria-label={saving ? "Saving board" : "Save scene"}
                  onClick={() => void saveScene()}
                >
                  {saving ? "Saving…" : "Save scene"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className={sceneOutlineBtnClass}
                  disabled={boardBusy || !activeSceneId}
                  aria-busy={reloadBusy}
                  onClick={() => void reloadScene()}
                >
                  {reloadBusy ? "Wait" : "Reload"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className={sceneOutlineBtnClass}
                  disabled={boardBusy || drawings.length === 0}
                  onClick={clearDrawings}
                >
                  Clear lines
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className={sceneOutlineBtnClass}
                  disabled={boardBusy || saving}
                  onClick={() => void resetLayout()}
                >
                  Reset Layout
                </Button>
              </div>
            </div>
          </div>

          <div className={toolGroupClass}>
            <p className={dockLabelClass}>Squad markers</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className={controlBtnClass}
                disabled={boardBusy || markers.length >= 40}
                onClick={addMarker}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="secondary"
                className={controlBtnClass}
                disabled={boardBusy || !selectedMarkerId}
                onClick={removeSelectedMarker}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {!isPresentMode && !coachWorkspace ? (
        <div className="relative z-0 flex flex-1 min-h-0 min-w-0">
          <div className="flex h-full min-h-0 w-full items-center justify-center px-1 pb-6 sm:px-2">
            {renderPitchSurface()}
          </div>
        </div>
      ) : null}

      {isPresentMode ? (
        <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center p-2">
            {renderPitchSurface()}
          </div>
        </div>
      ) : null}

      {!isPresentMode && !coachWorkspace ? (
        <div className="mx-5 mt-7 rounded-2xl border border-slate-200/75 bg-gradient-to-b from-slate-100/90 to-slate-100/50 px-4 py-3.5 text-center shadow-inner ring-1 ring-slate-900/[0.03] dark:border-slate-700/75 dark:from-slate-900/70 dark:to-slate-900/50 dark:ring-white/[0.04] sm:mx-7 lg:mx-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Canvas status
          </p>
          <p className="mt-1.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {markers.length}{" "}
            {markers.length === 1 ? "player" : "players"} · {drawings.length}{" "}
            {drawings.length === 1 ? "line" : "lines"}
          </p>
        </div>
      ) : null}
    </div>
    </div>
  );
}
