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
 * Map rough pitch tags to a highlight rectangle. Attack = top of vertical pitch.
 * When only `side` is set (no zone/lane), flashes a full-width band: opp → attack
 * third, own → defence third, neutral → midfield.
 * Returns null if nothing is set.
 */
export function buildPitchHighlightRect(
  zone?: PitchZone | string | null,
  lane?: PitchLane | string | null,
  side?: PitchSide | string | null,
): { x: number; y: number; w: number; h: number } | null {
  const zBand =
    zone === "attack"
      ? { y: 2, h: 36 }
      : zone === "midfield"
        ? { y: 38, h: 24 }
        : zone === "defence"
          ? { y: 62, h: 36 }
          : null;
  const lBand =
    lane === "left"
      ? { x: 2, w: 50 }
      : lane === "centre"
        ? { x: 52, w: 56 }
        : lane === "right"
          ? { x: 108, w: 50 }
          : null;

  if (zBand && lBand) {
    return { x: lBand.x, y: zBand.y, w: lBand.w, h: zBand.h };
  }
  if (zBand) {
    return { x: 2, y: zBand.y, w: 156, h: zBand.h };
  }
  if (lBand) {
    return { x: lBand.x, y: 2, w: lBand.w, h: 96 };
  }
  if (side === "opp") {
    return { x: 2, y: 2, w: 156, h: 36 };
  }
  if (side === "own") {
    return { x: 2, y: 62, w: 156, h: 36 };
  }
  if (side === "neutral") {
    return { x: 2, y: 38, w: 156, h: 24 };
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
