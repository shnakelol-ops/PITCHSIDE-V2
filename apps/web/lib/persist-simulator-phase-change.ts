/** POST `phase_change` so linked matches update `currentPeriod` on the server. */
import type { MatchPeriod } from "@pitchside/data-access";

export async function persistSimulatorPhaseChange(params: {
  matchId: string;
  matchPeriod: MatchPeriod;
  clockLabel: string;
}): Promise<void> {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matchId: params.matchId,
      type: "phase_change",
      context: {
        matchPeriod: params.matchPeriod,
        clockLabel: params.clockLabel.trim().slice(0, 32) || "00:00",
      },
    }),
  });
  const json = (await response.json()) as { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message ?? "Couldn’t save phase.");
  }
}
