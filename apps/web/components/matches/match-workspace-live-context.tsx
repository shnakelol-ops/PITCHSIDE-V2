"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MatchPeriod, type SportType } from "@pitchside/data-access";
import type { CreateMatchEventInput } from "@pitchside/validation";

import { normalizeMatchPeriod } from "@/components/match/MatchMode";
import type { PitchSport } from "@/config/pitchConfig";
import {
  persistBoardPitchSport,
  resolveHydratedBoardPitchSport,
  teamSportToPitchSport,
} from "@/lib/board-pitch-sport";
import {
  thirdLaneToApiPitch,
  type BoardPitchLane,
  type BoardPitchSide,
  type BoardPitchThird,
} from "@/lib/board-log-tap";
import { buildMatchEventPostBody } from "@/lib/match-event-pipeline";
import {
  normalizeLoggedEventRows,
  type LoggedEventRow,
} from "@/lib/match-events";
import { deriveLiveStats } from "@/lib/match-live-stats";
import { formatMatchPeriodLabel } from "@/lib/match-period-labels";
import { buildPitchHighlightRect } from "@/lib/pitch-location";
import {
  suggestSceneAfterLog,
  type SceneSuggestion,
} from "@/lib/match-scene-suggestions";

export type MatchWorkspaceRosterPlayer = {
  id: string;
  name: string;
};

export type PitchHighlightRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Armed by a board tap (Select tool); consumed when an event button logs. */
export type PendingBoardLogContext = {
  x: number;
  y: number;
  /** Composite e.g. `defensive_left` for timeline / maps. */
  zone: string;
  third: BoardPitchThird;
  lane: BoardPitchLane;
  side: BoardPitchSide;
  playerId: string | null;
  timestamp: number;
};

const EVENT_LABELS: Record<string, string> = {
  shot_goal: "GOAL",
  shot_point: "POINT",
  shot_two_pointer: "2 POINTER",
  shot_miss: "SHOT MISS",
  unforced_error: "UNFORCED ERROR",
  turnover_won: "TURNOVER WON",
  turnover_lost: "TURNOVER LOST",
  unforced_turnover: "UNFORCED TURNOVER",
  foul_for: "FOUL WON",
  foul_against: "FOUL CONCEDED",
  kickout_won: "KICKOUT WON",
  kickout_lost: "KICKOUT LOST",
  note: "NOTE",
  phase_change: "PHASE",
};

function summarizeLatestEvent(row: LoggedEventRow | undefined): string | null {
  if (!row) return null;
  if (row.type === "phase_change" && row.context?.matchPeriod) {
    return `Phase · ${formatMatchPeriodLabel(row.context.matchPeriod)}`;
  }
  return EVENT_LABELS[row.type] ?? row.type;
}

type EventsApiOk = {
  data: {
    events: unknown;
    currentPeriod: MatchPeriod | null;
  };
};

export type MatchWorkspaceLiveValue = {
  matchId: string;
  teamId: string;
  teamSport: SportType;
  players: MatchWorkspaceRosterPlayer[];
  period: MatchPeriod;
  clockDisplay: string;
  events: LoggedEventRow[] | null;
  loadError: string | null;
  isRefreshing: boolean;
  phaseWritePending: boolean;
  pitchHighlight: PitchHighlightRect | null;
  sceneSuggestion: SceneSuggestion | null;
  dismissSceneSuggestion: () => void;
  /** Goals – points when events are loaded; null while loading. */
  scoreGoalsPoints: string | null;
  lastEventSummary: string | null;
  setLoadError: (message: string | null) => void;
  postMatchEvent: (
    input: Omit<CreateMatchEventInput, "matchId">,
  ) => Promise<void>;
  fetchEvents: (opts?: { syncPeriodFromServer?: boolean }) => Promise<void>;
  handleRefresh: () => Promise<void>;
  handleModeChange: (mode: MatchPeriod) => Promise<void>;
  handleClockChange: (payload: { formatted: string }) => void;
  getClockLabel: () => string;
  scrollToPhaseControl: () => void;
  /** Board pitch rendering (markers/drawings stay in normalized space; switching sport does not reset them). */
  boardPitchSport: PitchSport;
  setBoardPitchSport: (sport: PitchSport) => void;
  /** Last board tap under Select — not an event until a sidebar button fires `runPost`. */
  pendingBoardLogContext: PendingBoardLogContext | null;
  applyBoardLogPick: (pick: Omit<PendingBoardLogContext, "zone" | "timestamp">) => void;
  clearPendingBoardLogContext: () => void;
};

const MatchWorkspaceLiveContext = createContext<
  MatchWorkspaceLiveValue | undefined
>(undefined);

type MatchWorkspaceLiveProviderProps = {
  matchId: string;
  teamId: string;
  teamSport: SportType;
  players: MatchWorkspaceRosterPlayer[];
  initialPeriod: MatchPeriod | null;
  children: ReactNode;
};

export function MatchWorkspaceLiveProvider({
  matchId,
  teamId,
  teamSport,
  players,
  initialPeriod,
  children,
}: MatchWorkspaceLiveProviderProps) {
  const [period, setPeriod] = useState<MatchPeriod>(() =>
    normalizeMatchPeriod(initialPeriod),
  );
  const [events, setEvents] = useState<LoggedEventRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [phaseWritePending, setPhaseWritePending] = useState(false);
  const [clockDisplay, setClockDisplay] = useState("00:00");
  const [pitchHighlight, setPitchHighlight] =
    useState<PitchHighlightRect | null>(null);
  const [sceneSuggestion, setSceneSuggestion] =
    useState<SceneSuggestion | null>(null);

  const [boardPitchSport, setBoardPitchSportState] = useState<PitchSport>(() =>
    teamSportToPitchSport(teamSport),
  );

  const [pendingBoardLogContext, setPendingBoardLogContext] =
    useState<PendingBoardLogContext | null>(null);

  const clockLabelRef = useRef("00:00");
  const eventsFetchGenRef = useRef(0);
  const pitchFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const boardTapFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (pitchFlashTimeoutRef.current != null) {
        clearTimeout(pitchFlashTimeoutRef.current);
      }
      if (boardTapFlashTimeoutRef.current != null) {
        clearTimeout(boardTapFlashTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setBoardPitchSportState(
      resolveHydratedBoardPitchSport(matchId, teamSport),
    );
  }, [matchId, teamSport]);

  const setBoardPitchSport = useCallback(
    (sport: PitchSport) => {
      setBoardPitchSportState(sport);
      persistBoardPitchSport(matchId, sport);
    },
    [matchId],
  );

  const fetchEvents = useCallback(
    async (opts?: { syncPeriodFromServer?: boolean }) => {
      const gen = ++eventsFetchGenRef.current;
      setLoadError(null);
      const qs = new URLSearchParams({
        matchId,
        _: String(Date.now()),
      });
      const response = await fetch(`/api/events?${qs.toString()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = (await response.json()) as
        | EventsApiOk
        | { error?: { message?: string } };

      if (gen !== eventsFetchGenRef.current) return;

      if (!response.ok) {
        const detail =
          ("error" in json && json.error?.message) || "Request failed.";
        setLoadError(`Couldn’t load events. ${detail} Tap Sync to try again.`);
        // Never clear an existing timeline on GET failure — e.g. after a
        // successful POST, a flaky reload would wipe optimistic updates and
        // feel like data loss pitchside.
        return;
      }

      if ("data" in json && json.data && Array.isArray(json.data.events)) {
        setEvents(normalizeLoggedEventRows(json.data.events));
        if (
          opts?.syncPeriodFromServer &&
          json.data.currentPeriod !== undefined &&
          json.data.currentPeriod !== null
        ) {
          setPeriod(normalizeMatchPeriod(json.data.currentPeriod));
        }
      } else if ("data" in json && json.data) {
        setLoadError(
          "Events data was missing or invalid. Tap Sync to reload from the server.",
        );
        setEvents((prev) => (prev === null ? [] : prev));
      }
    },
    [matchId],
  );

  useEffect(() => {
    void fetchEvents({ syncPeriodFromServer: true });
  }, [fetchEvents]);

  const dismissSceneSuggestion = useCallback(() => {
    setSceneSuggestion(null);
  }, []);

  const clearPendingBoardLogContext = useCallback(() => {
    setPendingBoardLogContext(null);
  }, []);

  const applyBoardLogPick = useCallback(
    (pick: Omit<PendingBoardLogContext, "zone" | "timestamp">) => {
      const zone = `${pick.third}_${pick.lane}`;
      setPendingBoardLogContext({
        ...pick,
        zone,
        timestamp: Date.now(),
      });

      const { pitchZone, pitchLane } = thirdLaneToApiPitch(pick.third, pick.lane);
      const rect = buildPitchHighlightRect(pitchZone, pitchLane);
      if (rect) {
        if (boardTapFlashTimeoutRef.current != null) {
          clearTimeout(boardTapFlashTimeoutRef.current);
        }
        setPitchHighlight(rect);
        boardTapFlashTimeoutRef.current = setTimeout(() => {
          setPitchHighlight(null);
          boardTapFlashTimeoutRef.current = null;
        }, 1600);
      }
    },
    [],
  );

  const postMatchEvent = useCallback(
    async (input: Omit<CreateMatchEventInput, "matchId">) => {
      const body = buildMatchEventPostBody(
        matchId,
        period,
        clockLabelRef.current,
        input,
      );
      const mergedContext = body.context ?? {};

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as {
        data?: { event?: unknown };
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(
          json.error?.message ?? "Couldn’t save event. Try again.",
        );
      }

      const rect = buildPitchHighlightRect(
        mergedContext.pitchZone,
        mergedContext.pitchLane,
        mergedContext.pitchSide,
      );
      if (rect) {
        if (pitchFlashTimeoutRef.current != null) {
          clearTimeout(pitchFlashTimeoutRef.current);
        }
        setPitchHighlight(rect);
        pitchFlashTimeoutRef.current = setTimeout(() => {
          setPitchHighlight(null);
          pitchFlashTimeoutRef.current = null;
        }, 2600);
      }

      const suggestionInput: Omit<CreateMatchEventInput, "matchId"> = {
        type: input.type,
        ...(input.playerId ? { playerId: input.playerId } : {}),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        context: mergedContext,
      };
      const sug = suggestSceneAfterLog(suggestionInput);
      if (sug) setSceneSuggestion(sug);

      const optimistic = normalizeLoggedEventRows(
        json.data?.event != null ? [json.data.event] : [],
      )[0];
      if (optimistic) {
        setEvents((prev) => {
          const base = prev ?? [];
          const deduped = base.filter((e) => e.id !== optimistic.id);
          return [optimistic, ...deduped];
        });
      }

      try {
        await fetchEvents();
      } catch (err) {
        console.warn(
          "[match-live] POST succeeded but event list refresh failed; timeline already updated optimistically.",
          err,
        );
      }
    },
    [matchId, fetchEvents, period],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchEvents({ syncPeriodFromServer: true });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchEvents]);

  const handleModeChange = useCallback(
    async (mode: MatchPeriod) => {
      const next = normalizeMatchPeriod(mode);
      if (next === period) return;

      const previous = period;
      setPeriod(next);
      setLoadError(null);
      setPhaseWritePending(true);
      try {
        await postMatchEvent({
          type: "phase_change",
          context: {
            matchPeriod: next,
            clockLabel: clockLabelRef.current,
          },
        });
      } catch (e) {
        setPeriod(previous);
        setLoadError(
          e instanceof Error
            ? e.message
            : "Couldn’t log phase change. Try again.",
        );
      } finally {
        setPhaseWritePending(false);
      }
    },
    [period, postMatchEvent],
  );

  const handleClockChange = useCallback(
    (payload: { formatted: string }) => {
      const next = payload.formatted || "00:00";
      clockLabelRef.current = next;
      setClockDisplay(next);
    },
    [],
  );

  const getClockLabel = useCallback(() => clockLabelRef.current, []);

  const scrollToPhaseControl = useCallback(() => {
    document
      .getElementById("match-phase-control")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const scoreGoalsPoints = useMemo(() => {
    if (events === null) return null;
    const s = deriveLiveStats(events, teamSport);
    return `${s.goals} – ${s.points}`;
  }, [events, teamSport]);

  const lastEventSummary = useMemo(
    () => summarizeLatestEvent(events?.[0]),
    [events],
  );

  const value = useMemo<MatchWorkspaceLiveValue>(
    () => ({
      matchId,
      teamId,
      teamSport,
      players,
      period,
      clockDisplay,
      events,
      loadError,
      isRefreshing,
      phaseWritePending,
      pitchHighlight,
      sceneSuggestion,
      dismissSceneSuggestion,
      scoreGoalsPoints,
      lastEventSummary,
      setLoadError,
      postMatchEvent,
      fetchEvents,
      handleRefresh,
      handleModeChange,
      handleClockChange,
      getClockLabel,
      scrollToPhaseControl,
      boardPitchSport,
      setBoardPitchSport,
      pendingBoardLogContext,
      applyBoardLogPick,
      clearPendingBoardLogContext,
    }),
    [
      matchId,
      teamId,
      teamSport,
      players,
      period,
      clockDisplay,
      events,
      loadError,
      isRefreshing,
      phaseWritePending,
      pitchHighlight,
      sceneSuggestion,
      dismissSceneSuggestion,
      scoreGoalsPoints,
      lastEventSummary,
      postMatchEvent,
      fetchEvents,
      handleRefresh,
      handleModeChange,
      handleClockChange,
      getClockLabel,
      scrollToPhaseControl,
      boardPitchSport,
      setBoardPitchSport,
      pendingBoardLogContext,
      applyBoardLogPick,
      clearPendingBoardLogContext,
    ],
  );

  return (
    <MatchWorkspaceLiveContext.Provider value={value}>
      {children}
    </MatchWorkspaceLiveContext.Provider>
  );
}

export function useMatchWorkspaceLive(): MatchWorkspaceLiveValue {
  const ctx = useContext(MatchWorkspaceLiveContext);
  if (!ctx) {
    throw new Error(
      "useMatchWorkspaceLive must be used within MatchWorkspaceLiveProvider",
    );
  }
  return ctx;
}

export function useMatchWorkspaceLiveOptional():
  | MatchWorkspaceLiveValue
  | undefined {
  return useContext(MatchWorkspaceLiveContext);
}
