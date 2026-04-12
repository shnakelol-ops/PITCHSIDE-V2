/** Stored on `Event.context` and used for board highlight geometry (SVG viewBox 0–160 × 0–100). */
export type PitchZone = "attack" | "midfield" | "defence";
export type PitchLane = "left" | "centre" | "right";
export type PitchSide = "own" | "opp" | "neutral";

export const PITCH_ZONES: { value: PitchZone; label: string }[] = [
  { value: "attack", label: "Attack third" },
  { value: "midfield", label: "Midfield" },
  { value: "defence", label: "Defence third" },
];

export const PITCH_LANES: { value: PitchLane; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "centre", label: "Centre" },
  { value: "right", label: "Right" },
];

export const PITCH_SIDES: { value: PitchSide; label: string }[] = [
  { value: "own", label: "Own end" },
  { value: "opp", label: "Opp. end" },
  { value: "neutral", label: "Neutral" },
];

/**
 * Map pitch tags to a highlight rectangle in legacy inner space (x∈[2,158], y∈[2,98],
 * w=156, h=96) — same frame as the tactical board: goals left/right, length on +x,
 * width on +y. Zone = along length (thirds on X); lane = across width (thirds on Y).
 * Side-only: full-height strip at attack / defence / midfield along X.
 */
export function buildPitchHighlightRect(
  zone?: PitchZone | string | null,
  lane?: PitchLane | string | null,
  side?: PitchSide | string | null,
): { x: number; y: number; w: number; h: number } | null {
  const zBandX =
    zone === "attack"
      ? { x: 106, w: 52 }
      : zone === "midfield"
        ? { x: 54, w: 52 }
        : zone === "defence"
          ? { x: 2, w: 52 }
          : null;
  const lBandY =
    lane === "left"
      ? { y: 2, h: 32 }
      : lane === "centre"
        ? { y: 34, h: 32 }
        : lane === "right"
          ? { y: 66, h: 32 }
          : null;

  if (zBandX && lBandY) {
    return {
      x: zBandX.x,
      y: lBandY.y,
      w: zBandX.w,
      h: lBandY.h,
    };
  }
  if (zBandX) {
    return { x: zBandX.x, y: 2, w: zBandX.w, h: 96 };
  }
  if (lBandY) {
    return { x: 2, y: lBandY.y, w: 156, h: lBandY.h };
  }
  if (side === "opp") {
    return { x: 106, y: 2, w: 52, h: 96 };
  }
  if (side === "own") {
    return { x: 2, y: 2, w: 52, h: 96 };
  }
  if (side === "neutral") {
    return { x: 54, y: 2, w: 52, h: 96 };
  }
  return null;
}

export function formatPitchLocationLabel(
  zone?: string | null,
  lane?: string | null,
  side?: string | null,
): string | null {
  const parts: string[] = [];
  if (zone) parts.push(zone.charAt(0).toUpperCase() + zone.slice(1));
  if (lane) parts.push(lane);
  if (side) parts.push(`${side} side`);
  return parts.length ? parts.join(" · ") : null;
}
