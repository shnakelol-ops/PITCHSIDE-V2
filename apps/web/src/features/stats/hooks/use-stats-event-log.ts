"use client";

import { useCallback, useReducer, useRef } from "react";

import type { StatsPitchTapPayload } from "@src/features/stats/types/stats-pitch-tap";
import {
  createStatsLoggedEvent,
  type StatsEventSelection,
  type StatsFieldEventType,
  type StatsLoggedEvent,
  type StatsScoreType,
} from "@src/features/stats/model/stats-logged-event";
import {
  assignScorerToEvents,
  findLatestScorePendingScorer,
} from "@src/features/stats/model/stats-scorer-utils";
import { assignVoiceNoteToEvents } from "@src/features/stats/model/stats-voice-utils";
import type { StatsReviewMode } from "@src/features/stats/types/stats-review-mode";

export type StatsArmSelection = StatsEventSelection | null;

type State = {
  events: StatsLoggedEvent[];
  arm: StatsArmSelection;
  preferredScorerId: string | null;
  reviewMode: StatsReviewMode;
  /** Voice clips with no linked event (moment-only). */
  voiceMomentIds: string[];
};

type Action =
  | { type: "arm"; selection: StatsEventSelection }
  | { type: "clearArm" }
  | { type: "logTap"; payload: StatsPitchTapPayload }
  | { type: "resetEvents" }
  | { type: "pickScorer"; playerId: string }
  | { type: "clearPreferredScorer" }
  | { type: "assignScorer"; eventId: string; scorerId: string | null }
  | { type: "setReviewMode"; mode: StatsReviewMode }
  | { type: "attachVoiceNoteToEvent"; eventId: string; voiceNoteId: string }
  | { type: "addVoiceMoment"; voiceNoteId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "arm":
      return { ...state, arm: action.selection };
    case "clearArm":
      return { ...state, arm: null };
    case "clearPreferredScorer":
      return { ...state, preferredScorerId: null };
    case "setReviewMode":
      return { ...state, reviewMode: action.mode };
    case "resetEvents":
      return {
        ...state,
        events: [],
        preferredScorerId: null,
        reviewMode: "live",
        voiceMomentIds: [],
      };
    case "assignScorer":
      return {
        ...state,
        events: assignScorerToEvents(state.events, action.eventId, action.scorerId),
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
      if (state.voiceMomentIds.includes(action.voiceNoteId)) return state;
      return {
        ...state,
        voiceMomentIds: [...state.voiceMomentIds, action.voiceNoteId],
      };
    }
    case "pickScorer": {
      const pending = findLatestScorePendingScorer(state.events);
      if (pending) {
        return {
          ...state,
          events: assignScorerToEvents(state.events, pending.id, action.playerId),
        };
      }
      return { ...state, preferredScorerId: action.playerId };
    }
    case "logTap": {
      if (!state.arm) return state;
      const scorerForScore =
        state.arm.domain === "score" ? state.preferredScorerId : undefined;
      const event = createStatsLoggedEvent({
        selection: state.arm,
        nx: action.payload.nx,
        ny: action.payload.ny,
        timestampMs: action.payload.atMs,
        scorerId: scorerForScore ?? undefined,
      });
      return {
        ...state,
        events: [...state.events, event],
        preferredScorerId:
          state.arm.domain === "score" ? null : state.preferredScorerId,
      };
    }
  }
}

const initialState: State = {
  events: [],
  arm: null,
  preferredScorerId: null,
  reviewMode: "live",
  voiceMomentIds: [],
};

export function useStatsEventLog() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const voiceBlobsRef = useRef<Map<string, Blob>>(new Map());

  const storeVoiceBlob = useCallback((id: string, blob: Blob) => {
    voiceBlobsRef.current.set(id, blob);
  }, []);

  const removeVoiceBlob = useCallback((id: string) => {
    voiceBlobsRef.current.delete(id);
  }, []);

  const playVoiceNote = useCallback((id: string) => {
    const blob = voiceBlobsRef.current.get(id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const revoke = () => URL.revokeObjectURL(url);
    audio.addEventListener("ended", revoke, { once: true });
    audio.addEventListener("error", revoke, { once: true });
    void audio.play().catch(() => revoke());
  }, []);

  const clearAllVoiceBlobs = useCallback(() => {
    voiceBlobsRef.current.clear();
  }, []);

  const armField = useCallback((fieldType: StatsFieldEventType) => {
    dispatch({ type: "arm", selection: { domain: "field", fieldType } });
  }, []);

  const armScore = useCallback((scoreType: StatsScoreType) => {
    dispatch({ type: "arm", selection: { domain: "score", scoreType } });
  }, []);

  const clearArm = useCallback(() => {
    dispatch({ type: "clearArm" });
  }, []);

  const logTap = useCallback((payload: StatsPitchTapPayload) => {
    dispatch({ type: "logTap", payload });
  }, []);

  const resetEvents = useCallback(() => {
    clearAllVoiceBlobs();
    dispatch({ type: "resetEvents" });
  }, [clearAllVoiceBlobs]);

  const pickScorer = useCallback((playerId: string) => {
    dispatch({ type: "pickScorer", playerId });
  }, []);

  const clearPreferredScorer = useCallback(() => {
    dispatch({ type: "clearPreferredScorer" });
  }, []);

  const assignScorerToEvent = useCallback((eventId: string, scorerId: string | null) => {
    dispatch({ type: "assignScorer", eventId, scorerId });
  }, []);

  const setReviewMode = useCallback((mode: StatsReviewMode) => {
    dispatch({ type: "setReviewMode", mode });
  }, []);

  const attachVoiceNoteToEvent = useCallback((eventId: string, voiceNoteId: string) => {
    dispatch({ type: "attachVoiceNoteToEvent", eventId, voiceNoteId });
  }, []);

  const addVoiceMoment = useCallback((voiceNoteId: string) => {
    dispatch({ type: "addVoiceMoment", voiceNoteId });
  }, []);

  return {
    events: state.events,
    arm: state.arm,
    preferredScorerId: state.preferredScorerId,
    reviewMode: state.reviewMode,
    voiceMomentIds: state.voiceMomentIds,
    armField,
    armScore,
    clearArm,
    logTap,
    resetEvents,
    pickScorer,
    clearPreferredScorer,
    assignScorerToEvent,
    setReviewMode,
    storeVoiceBlob,
    removeVoiceBlob,
    playVoiceNote,
    attachVoiceNoteToEvent,
    addVoiceMoment,
  };
}
