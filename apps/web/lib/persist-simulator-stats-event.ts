/** One-off bridge: STATS `StatsLoggedEvent` → same `POST /api/events` body as match workspace. */
import type { MatchPeriod } from "@pitchside/data-access";

import { buildMatchEventPostBody } from "@/lib/match-event-pipeline";
import {
  statsLoggedEventToCreateInput,
} from "@/lib/stats-logged-event-to-match-event";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";

/**
 * Persists a single STATS-mode pitch log to `POST /api/events` (same body shape as match workspace).
 * Used when `/simulator` is opened with `?matchId=` — sandbox sessions skip persistence.
 */
export async function persistSimulatorStatsEvent(params: {
  matchId: string;
  matchPeriod: MatchPeriod;
  clockLabel: string;
  event: StatsLoggedEvent;
}): Promise<void> {
  const input = statsLoggedEventToCreateInput(params.event);
  const body = buildMatchEventPostBody(
    params.matchId,
    params.matchPeriod,
    params.clockLabel,
    input,
  );
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message ?? "Couldn’t save event.");
  }
}
