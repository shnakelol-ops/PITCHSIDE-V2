export type MatchClockState = {
  elapsedMs: number;
  isRunning: boolean;
  startedAtMs: number | null;
};

export const MATCH_MINUTE_MS = 60_000;

export function createMatchClockState(): MatchClockState {
  return {
    elapsedMs: 0,
    isRunning: false,
    startedAtMs: null,
  };
}

export function startClock(
  state: MatchClockState,
  nowMs: number = Date.now(),
): MatchClockState {
  if (state.isRunning) return state;
  return {
    ...state,
    isRunning: true,
    startedAtMs: nowMs,
  };
}

export function resumeClock(
  state: MatchClockState,
  nowMs: number = Date.now(),
): MatchClockState {
  return startClock(state, nowMs);
}

export function pauseClock(
  state: MatchClockState,
  nowMs: number = Date.now(),
): MatchClockState {
  if (!state.isRunning || state.startedAtMs === null) return state;
  return {
    elapsedMs: state.elapsedMs + Math.max(0, nowMs - state.startedAtMs),
    isRunning: false,
    startedAtMs: null,
  };
}

export function resetClock(): MatchClockState {
  return createMatchClockState();
}

export function getElapsedMs(
  state: MatchClockState,
  nowMs: number = Date.now(),
): number {
  if (!state.isRunning || state.startedAtMs === null) return state.elapsedMs;
  return state.elapsedMs + Math.max(0, nowMs - state.startedAtMs);
}

export function getElapsedSeconds(
  state: MatchClockState,
  nowMs: number = Date.now(),
): number {
  return Math.floor(getElapsedMs(state, nowMs) / 1_000);
}

export function getElapsedMinutes(
  state: MatchClockState,
  nowMs: number = Date.now(),
): number {
  return Math.floor(getElapsedMs(state, nowMs) / MATCH_MINUTE_MS);
}

export function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const ZERO_CLOCK = "00:00";
