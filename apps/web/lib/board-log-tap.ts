import type { BoardMarkerState } from "@/lib/board-v1-defaults";

/** Length along pitch (0 = own goal, 1 = opposition goal). */
export type BoardPitchThird = "defensive" | "middle" | "attacking";

/** Width across pitch (0 top touchline, 1 bottom). */
export type BoardPitchLane = "left" | "centre" | "right";

export type BoardPitchSide = "own" | "opp" | "neutral";

/**
 * Vertical thirds by x, horizontal lanes by y (board stored normalised space).
 * Own half x < 0.5, opposition x > 0.5, neutral on centreline band.
 */
export function deriveBoardTapZones(
  x: number,
  y: number,
): { third: BoardPitchThird; lane: BoardPitchLane; side: BoardPitchSide } {
  const tx = Math.min(1, Math.max(0, x));
  const ty = Math.min(1, Math.max(0, y));

  const third: BoardPitchThird =
    tx < 1 / 3 ? "defensive" : tx < 2 / 3 ? "middle" : "attacking";

  const lane: BoardPitchLane =
    ty < 1 / 3 ? "left" : ty < 2 / 3 ? "centre" : "right";

  let side: BoardPitchSide = "neutral";
  if (tx < 0.5 - 1e-9) side = "own";
  else if (tx > 0.5 + 1e-9) side = "opp";

  return { third, lane, side };
}

export function thirdLaneToApiPitch(
  third: BoardPitchThird,
  lane: BoardPitchLane,
): {
  pitchZone: "attack" | "midfield" | "defence";
  pitchLane: "left" | "centre" | "right";
} {
  const pitchZone =
    third === "attacking"
      ? "attack"
      : third === "defensive"
        ? "defence"
        : "midfield";
  return { pitchZone, pitchLane: lane };
}

const DEFAULT_RADIUS = 0.11;

/**
 * Nearest marker within radius in normalised board space.
 * Roster index: marker label "1".."n" maps to `roster[n-1].id` when in range.
 */
export function resolveBoardTapPlayer(
  markers: BoardMarkerState[],
  tapX: number,
  tapY: number,
  roster: { id: string; name: string }[],
  radius: number = DEFAULT_RADIUS,
): { playerId: string | null; markerId: string | null } {
  if (!markers.length) {
    return { playerId: null, markerId: null };
  }

  let best: { id: string; label: string; d2: number } | null = null;
  for (const m of markers) {
    const dx = m.x - tapX;
    const dy = m.y - tapY;
    const d2 = dx * dx + dy * dy;
    if (!best || d2 < best.d2) {
      best = { id: m.id, label: m.label, d2 };
    }
  }

  if (!best) return { playerId: null, markerId: null };
  const r2 = radius * radius;
  if (best.d2 > r2) return { playerId: null, markerId: null };

  const idx = Number.parseInt(best.label.trim(), 10);
  if (!Number.isFinite(idx) || idx < 1 || idx > roster.length) {
    return { playerId: null, markerId: best.id };
  }

  return { playerId: roster[idx - 1]?.id ?? null, markerId: best.id };
}
