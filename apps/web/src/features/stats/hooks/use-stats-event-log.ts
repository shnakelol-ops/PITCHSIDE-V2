"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";
import {
  createStatsLoggedEvent,
  type StatsPeriodPhase,
  type StatsLoggedEvent,
} from "@src/features/stats/model/stats-logged-event";
import {
  isStatsV1ScoreKind,
  type StatsV1EventKind,
} from "@src/features/stats/model/stats-v1-event-kind";
import {
  resolveTargetEventId,
  type StatsContextTag,
} from "@src/features/stats/model/stats-more-tags";
import {
  assignScorerToEvents,
  findLatestScorePendingScorer,
} from "@src/features/stats/model/stats-scorer-utils";
import { assignVoiceNoteToEvents } from "@src/features/stats/model/stats-voice-utils";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";

const ACTIVE_SCORER_STORAGE_KEY = "pitchside.stats.activeScorerId";

export type StatsArmSelection = StatsV1EventKind | null;

/**
 * Lightweight voice-moment record — NOT an event. Used only to time-stamp clips
 * captured outside an event attachment so HT/FT review can surface them in order.
 */
export type StatsVoiceMoment = {
  id: string;
  timestampMs: number;
  periodPhase: StatsPeriodPhase;
};

/**
 * Surfaced playback failure (id + short reason). Consumers render a compact
 * inline marker on the failing clip so a dead play button is never silent.
 * Auto-clears after a short window so one transient failure doesn't latch.
 */
export type StatsVoicePlaybackError = {
  id: string;
  reason: string;
};

const PLAYBACK_ERROR_AUTOCLEAR_MS = 6000;

type State = {
  events: StatsLoggedEvent[];
  arm: StatsArmSelection;
  /** Persists until changed; applied to every score tap (null = no player). */
  activeScorerId: string | null;
  reviewMode: StatsReviewMode;
  /** Voice clips with no linked event (moment-only) — newest last. */
  voiceMoments: StatsVoiceMoment[];
};

type Action =
  | { type: "arm"; kind: StatsV1EventKind }
  | { type: "clearArm" }
  | {
      type: "logTap";
      payload: StatsPitchTapPayload;
      periodPhase?: StatsPeriodPhase;
    }
  | { type: "undoLastEvent" }
  | { type: "resetEvents" }
  | { type: "setActiveScorer"; playerId: string | null }
  | { type: "restoreActiveScorer"; playerId: string | null }
  | { type: "assignScorer"; eventId: string; playerId: string | null }
  | { type: "setReviewMode"; mode: StatsReviewMode }
  | { type: "attachVoiceNoteToEvent"; eventId: string; voiceNoteId: string }
  | {
      type: "addVoiceMoment";
      voiceNoteId: string;
      timestampMs: number;
      periodPhase: StatsPeriodPhase;
    }
  | { type: "removeVoiceMoment"; voiceNoteId: string }
  | { type: "applyContextTag"; tag: StatsContextTag };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "arm":
      return { ...state, arm: action.kind };
    case "clearArm":
      return { ...state, arm: null };
    case "setReviewMode":
      return { ...state, reviewMode: action.mode };
    case "resetEvents":
      return {
        ...state,
        events: [],
        activeScorerId: null,
        reviewMode: "live",
        voiceMoments: [],
      };
    case "assignScorer":
      return {
        ...state,
        events: assignScorerToEvents(state.events, action.eventId, action.playerId),
      };
    case "attachVoiceNoteToEvent":
      return {
        ...state,
        events: assignVoiceNoteToEvents(
          state.events,
          action.eventId,
          action.voiceNoteId,
        ),
      };
    case "addVoiceMoment": {
      if (state.voiceMoments.some((m) => m.id === action.voiceNoteId)) {
        return state;
      }
      const moment: StatsVoiceMoment = {
        id: action.voiceNoteId,
        timestampMs: action.timestampMs,
        periodPhase: action.periodPhase,
      };
      return {
        ...state,
        voiceMoments: [...state.voiceMoments, moment],
      };
    }
    case "removeVoiceMoment": {
      if (!state.voiceMoments.some((m) => m.id === action.voiceNoteId)) {
        return state;
      }
      return {
        ...state,
        voiceMoments: state.voiceMoments.filter(
          (m) => m.id !== action.voiceNoteId,
        ),
      };
    }
    case "restoreActiveScorer":
      return { ...state, activeScorerId: action.playerId };
    case "setActiveScorer": {
      const pending = findLatestScorePendingScorer(state.events);
      const events = pending
        ? assignScorerToEvents(state.events, pending.id, action.playerId)
        : state.events;
      return { ...state, events, activeScorerId: action.playerId };
    }
    case "logTap": {
      if (!state.arm) return state;
      const playerForScore =
        isStatsV1ScoreKind(state.arm) ? state.activeScorerId : undefined;
      const event = createStatsLoggedEvent({
        kind: state.arm,
        nx: action.payload.nx,
        ny: action.payload.ny,
        timestampMs: action.payload.atMs,
        periodPhase: action.periodPhase,
        playerId: playerForScore === undefined ? undefined : playerForScore,
      });
      return {
        ...state,
        events: [...state.events, event],
      };
    }
    case "undoLastEvent":
      if (state.events.length === 0) return state;
      return { ...state, events: state.events.slice(0, -1) };
    case "applyContextTag": {
      // Attach tag to the latest relevant event (dedup). No-op when no target
      // exists — UI guards this with the disabled-row state.
      const targetId = resolveTargetEventId(state.events, action.tag);
      if (!targetId) return state;
      return {
        ...state,
        events: state.events.map((e) => {
          if (e.id !== targetId) return e;
          const existing = e.contextTags ?? [];
          if (existing.includes(action.tag)) return e;
          return { ...e, contextTags: [...existing, action.tag] };
        }),
      };
    }
  }
}

const initialState: State = {
  events: [],
  arm: null,
  activeScorerId: null,
  reviewMode: "live",
  voiceMoments: [],
};

function readStoredActiveScorerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_SCORER_STORAGE_KEY);
    if (raw == null || raw === "") return null;
    return raw;
  } catch {
    return null;
  }
}

export type UseStatsEventLogOptions = {
  onStatsEventLogged?: (event: StatsLoggedEvent) => void;
  resolvePeriodPhase?: () => StatsPeriodPhase;
};

export function useStatsEventLog(options?: UseStatsEventLogOptions) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const voiceBlobsRef = useRef<Map<string, Blob>>(new Map());
  const voicePlaybackRef = useRef<HTMLAudioElement | null>(null);
  const voicePlaybackUrlRef = useRef<string | null>(null);
  const [voicePlaybackError, setVoicePlaybackError] =
    useState<StatsVoicePlaybackError | null>(null);
  const voicePlaybackErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const skipNextPersistRef = useRef(true);
  const onStatsEventLoggedRef = useRef(options?.onStatsEventLogged);
  onStatsEventLoggedRef.current = options?.onStatsEventLogged;
  const resolvePeriodPhaseRef = useRef(options?.resolvePeriodPhase);
  resolvePeriodPhaseRef.current = options?.resolvePeriodPhase;
  const prevEventCountRef = useRef(0);

  useEffect(() => {
    const n = state.events.length;
    if (
      n > prevEventCountRef.current &&
      n > 0 &&
      onStatsEventLoggedRef.current
    ) {
      const added = state.events[n - 1];
      if (added) onStatsEventLoggedRef.current(added);
    }
    prevEventCountRef.current = n;
  }, [state.events]);

  useEffect(() => {
    const id = readStoredActiveScorerId();
    if (id != null) {
      dispatch({ type: "restoreActiveScorer", playerId: id });
    }
  }, []);

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    try {
      if (state.activeScorerId == null) {
        window.sessionStorage.removeItem(ACTIVE_SCORER_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(ACTIVE_SCORER_STORAGE_KEY, state.activeScorerId);
      }
    } catch {
      /* ignore quota / private mode */
    }
  }, [state.activeScorerId]);

  const storeVoiceBlob = useCallback((id: string, blob: Blob) => {
    voiceBlobsRef.current.set(id, blob);
  }, []);

  const removeVoiceBlob = useCallback((id: string) => {
    voiceBlobsRef.current.delete(id);
  }, []);

  const reportPlaybackError = useCallback((id: string, reason: string) => {
    setVoicePlaybackError({ id, reason });
    if (voicePlaybackErrorTimerRef.current) {
      clearTimeout(voicePlaybackErrorTimerRef.current);
    }
    voicePlaybackErrorTimerRef.current = setTimeout(() => {
      setVoicePlaybackError((cur) => (cur && cur.id === id ? null : cur));
      voicePlaybackErrorTimerRef.current = null;
    }, PLAYBACK_ERROR_AUTOCLEAR_MS);
  }, []);

  const clearPlaybackError = useCallback(() => {
    if (voicePlaybackErrorTimerRef.current) {
      clearTimeout(voicePlaybackErrorTimerRef.current);
      voicePlaybackErrorTimerRef.current = null;
    }
    setVoicePlaybackError(null);
  }, []);

  const playVoiceNote = useCallback(
    (id: string) => {
      // MUST stay synchronous within the caller's click handler for browser
      // autoplay policy to treat this as a user-initiated gesture.
      console.log("PLAY PIPE hook", id);

      const blob = voiceBlobsRef.current.get(id);
      console.log("BLOB", blob);

      // ── Pre-play validation ──
      // Surface the single unified UI reason on any form of failure so the
      // coach sees "Playback failed — unsupported format or empty clip"
      // consistently rather than a variable internal string.
      const FAIL_REASON = "unsupported format or empty clip";

      if (!blob) {
        console.warn("PLAY FAILED", id, "no blob");
        reportPlaybackError(id, FAIL_REASON);
        return;
      }
      if (blob.size === 0) {
        console.warn("PLAY FAILED", id, "empty blob");
        reportPlaybackError(id, FAIL_REASON);
        return;
      }
      if (!blob.type) {
        console.warn("PLAY FAILED", id, "no MIME type");
        reportPlaybackError(id, FAIL_REASON);
        return;
      }

      // Fresh attempt — clear stale error for this id.
      setVoicePlaybackError((cur) => (cur && cur.id === id ? null : cur));

      // Stop anything currently playing.
      const prevAudio = voicePlaybackRef.current;
      const prevUrl = voicePlaybackUrlRef.current;
      voicePlaybackRef.current = null;
      voicePlaybackUrlRef.current = null;
      if (prevAudio) {
        try {
          prevAudio.pause();
          prevAudio.src = "";
        } catch {
          /* ignore */
        }
      }
      if (prevUrl) {
        try {
          URL.revokeObjectURL(prevUrl);
        } catch {
          /* ignore */
        }
      }

      // ── Minimal known-good playback ──
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      voicePlaybackUrlRef.current = url;
      voicePlaybackRef.current = audio;

      const cleanup = () => {
        if (voicePlaybackUrlRef.current === url) {
          voicePlaybackUrlRef.current = null;
          voicePlaybackRef.current = null;
        }
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      };

      audio.onplay = () => console.log("PLAY STARTED", id);
      audio.onended = () => {
        console.log("PLAY ENDED", id);
        cleanup();
      };
      audio.onerror = () => {
        const code = audio.error?.code;
        const msg = audio.error?.message ?? "";
        console.error("PLAY ERROR", id, code, msg);
        // Only surface if playback never actually started; otherwise an
        // engine-level transient error shouldn't overwrite a working clip.
        if (audio.paused && audio.currentTime === 0) {
          reportPlaybackError(id, FAIL_REASON);
        }
      };

      audio.play().catch((err) => {
        console.error("PLAY FAILED", id, err);
        const name =
          err && typeof err === "object" && "name" in err
            ? String((err as { name: unknown }).name)
            : "";
        // NotAllowedError is the only non-format failure we distinguish:
        // it means the browser rejected the gesture (rare with a real click).
        const reason =
          name === "NotAllowedError"
            ? "Autoplay blocked — tap again"
            : FAIL_REASON;
        reportPlaybackError(id, reason);
        cleanup();
      });
    },
    [reportPlaybackError],
  );

  useEffect(() => {
    return () => {
      const a = voicePlaybackRef.current;
      const u = voicePlaybackUrlRef.current;
      voicePlaybackRef.current = null;
      voicePlaybackUrlRef.current = null;
      if (a) {
        a.pause();
        a.src = "";
      }
      if (u) URL.revokeObjectURL(u);
      if (voicePlaybackErrorTimerRef.current) {
        clearTimeout(voicePlaybackErrorTimerRef.current);
        voicePlaybackErrorTimerRef.current = null;
      }
    };
  }, []);

  const clearAllVoiceBlobs = useCallback(() => {
    voiceBlobsRef.current.clear();
  }, []);

  const armKind = useCallback((kind: StatsV1EventKind) => {
    dispatch({ type: "arm", kind });
  }, []);

  const clearArm = useCallback(() => {
    dispatch({ type: "clearArm" });
  }, []);

  const logTap = useCallback((payload: StatsPitchTapPayload) => {
    dispatch({
      type: "logTap",
      payload,
      periodPhase: resolvePeriodPhaseRef.current?.(),
    });
  }, []);

  const undoLastEvent = useCallback(() => {
    dispatch({ type: "undoLastEvent" });
  }, []);

  const resetEvents = useCallback(() => {
    clearAllVoiceBlobs();
    dispatch({ type: "resetEvents" });
  }, [clearAllVoiceBlobs]);

  const setActiveScorer = useCallback((playerId: string | null) => {
    dispatch({ type: "setActiveScorer", playerId });
  }, []);

  const assignScorerToEvent = useCallback((eventId: string, playerId: string | null) => {
    dispatch({ type: "assignScorer", eventId, playerId });
  }, []);

  const setReviewMode = useCallback((mode: StatsReviewMode) => {
    dispatch({ type: "setReviewMode", mode });
  }, []);

  const attachVoiceNoteToEvent = useCallback((eventId: string, voiceNoteId: string) => {
    dispatch({ type: "attachVoiceNoteToEvent", eventId, voiceNoteId });
  }, []);

  const addVoiceMoment = useCallback(
    (voiceNoteId: string, timestampMs: number, periodPhase: StatsPeriodPhase) => {
      dispatch({
        type: "addVoiceMoment",
        voiceNoteId,
        timestampMs,
        periodPhase,
      });
    },
    [],
  );

  const removeVoiceMoment = useCallback((voiceNoteId: string) => {
    dispatch({ type: "removeVoiceMoment", voiceNoteId });
  }, []);

  const applyContextTag = useCallback((tag: StatsContextTag) => {
    dispatch({ type: "applyContextTag", tag });
  }, []);

  return {
    events: state.events,
    arm: state.arm,
    activeScorerId: state.activeScorerId,
    reviewMode: state.reviewMode,
    voiceMoments: state.voiceMoments,
    voicePlaybackError,
    armKind,
    clearArm,
    logTap,
    undoLastEvent,
    resetEvents,
    setActiveScorer,
    assignScorerToEvent,
    setReviewMode,
    storeVoiceBlob,
    removeVoiceBlob,
    playVoiceNote,
    clearPlaybackError,
    attachVoiceNoteToEvent,
    addVoiceMoment,
    removeVoiceMoment,
    applyContextTag,
  };
}
