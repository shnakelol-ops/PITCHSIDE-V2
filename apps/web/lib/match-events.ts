import type { MatchEventType } from "@pitchside/validation";

export type MatchEventContextClient = {
  matchPeriod?: string;
  clockLabel?: string;
  pitchZone?: string;
  pitchLane?: string;
  pitchSide?: string;
} | null;

/** Row shape returned by GET /api/events (single source of truth for the live dashboard). */
export type LoggedEventRow = {
  id: string;
  type: MatchEventType;
  note: string | null;
  timestamp: string;
  playerId: string | null;
  playerName: string | null;
  context: MatchEventContextClient;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Defensive parse so the UI never maps over undefined / malformed rows. */
export function normalizeLoggedEventRows(input: unknown): LoggedEventRow[] {
  if (!Array.isArray(input)) return [];
  const out: LoggedEventRow[] = [];
  for (const item of input) {
    if (!isRecord(item)) continue;
    const id = item.id;
    const type = item.type;
    const timestamp = item.timestamp;
    if (typeof id !== "string" || id.length === 0) continue;
    if (typeof type !== "string" || type.length === 0) continue;
    if (typeof timestamp !== "string") continue;
    out.push({
      id,
      type: type as MatchEventType,
      note: typeof item.note === "string" ? item.note : null,
      timestamp,
      playerId: typeof item.playerId === "string" ? item.playerId : null,
      playerName: typeof item.playerName === "string" ? item.playerName : null,
      context:
        item.context === null || item.context === undefined
          ? null
          : isRecord(item.context)
            ? {
                matchPeriod:
                  typeof item.context.matchPeriod === "string"
                    ? item.context.matchPeriod
                    : undefined,
                clockLabel:
                  typeof item.context.clockLabel === "string"
                    ? item.context.clockLabel
                    : undefined,
                pitchZone:
                  typeof item.context.pitchZone === "string"
                    ? item.context.pitchZone
                    : undefined,
                pitchLane:
                  typeof item.context.pitchLane === "string"
                    ? item.context.pitchLane
                    : undefined,
                pitchSide:
                  typeof item.context.pitchSide === "string"
                    ? item.context.pitchSide
                    : undefined,
              }
            : null,
    });
  }
  return out;
}
