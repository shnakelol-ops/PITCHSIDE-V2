/** Display labels for MatchPeriod enum strings (server + client). */
export const MATCH_PERIOD_LABELS: Record<string, string> = {
  WARMUP: "Warm-up",
  FIRST_HALF: "1st Half",
  HALF_TIME: "Half-time",
  SECOND_HALF: "2nd Half",
  EXTRA_TIME_FIRST: "ET 1",
  EXTRA_TIME_SECOND: "ET 2",
  PENALTIES: "Penalties",
  FULL_TIME: "Full-time",
};

export function formatMatchPeriodLabel(period: string | undefined | null): string {
  if (!period) return "Phase";
  return MATCH_PERIOD_LABELS[period] ?? period.replaceAll("_", " ");
}
