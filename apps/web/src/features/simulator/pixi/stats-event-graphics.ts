import { Graphics } from "pixi.js";

import {
  getStatsEventMarkerStyle,
  type StatsMarkerStyleOptions,
} from "@src/features/stats/board/stats-event-marker-style";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import { boardNormToWorld } from "@src/lib/pitch-coordinates";

export type DrawStatsEventsOptions = StatsMarkerStyleOptions & {
  /** Letterboxed world scale (world units → CSS px). Used to enforce minimum on-screen dot size. */
  worldToScreenScale?: number;
  minScreenRadiusPx?: number;
  /**
   * Draw-only nudge so stacked events stay visible; does not change stored nx/ny.
   * @default true
   */
  visualSeparation?: boolean;
};

type ParsedCssColor = { color: number; alpha: number };

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 1));
}

function rgbToPixiColor(r: number, g: number, b: number): number {
  return (clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b);
}

/**
 * Converts CSS `rgb()` / `rgba()` from marker styles into Pixi `color` + `alpha`.
 * Pixi does not accept CSS Color 4 space-separated forms like `rgb(74 222 128)` or `rgba(248 250 252, 0.96)`.
 */
function parseCssColorForPixi(css: string): ParsedCssColor {
  const s = css.trim();
  const m = s.match(/^rgba?\(\s*(.+?)\s*\)$/i);
  if (!m) {
    if (s.startsWith("#")) {
      const hex = s.slice(1);
      if (hex.length === 6 && /^[0-9a-f]+$/i.test(hex)) {
        return { color: parseInt(hex, 16), alpha: 1 };
      }
      if (hex.length === 3 && /^[0-9a-f]{3}$/i.test(hex)) {
        return {
          color: rgbToPixiColor(
            parseInt(hex[0]! + hex[0]!, 16),
            parseInt(hex[1]! + hex[1]!, 16),
            parseInt(hex[2]! + hex[2]!, 16),
          ),
          alpha: 1,
        };
      }
    }
    return { color: 0xffffff, alpha: 1 };
  }

  const inner = m[1]!.trim();

  if (inner.includes("/")) {
    const [rgbPart, aPart] = inner.split("/").map((x) => x.trim());
    const parts = rgbPart!.split(/\s+/).map(parseFloat).filter(Number.isFinite);
    const alpha = parseFloat(aPart!);
    if (parts.length >= 3) {
      return {
        color: rgbToPixiColor(parts[0]!, parts[1]!, parts[2]!),
        alpha: clamp01(alpha),
      };
    }
  }

  const commaSegs = inner.split(",").map((x) => x.trim());
  if (commaSegs.length === 4) {
    return {
      color: rgbToPixiColor(
        parseFloat(commaSegs[0]!),
        parseFloat(commaSegs[1]!),
        parseFloat(commaSegs[2]!),
      ),
      alpha: clamp01(parseFloat(commaSegs[3]!)),
    };
  }
  if (commaSegs.length === 3) {
    return {
      color: rgbToPixiColor(
        parseFloat(commaSegs[0]!),
        parseFloat(commaSegs[1]!),
        parseFloat(commaSegs[2]!),
      ),
      alpha: 1,
    };
  }
  if (commaSegs.length === 2) {
    const rgb = commaSegs[0]!.split(/\s+/).map(parseFloat).filter(Number.isFinite);
    if (rgb.length >= 3) {
      return {
        color: rgbToPixiColor(rgb[0]!, rgb[1]!, rgb[2]!),
        alpha: clamp01(parseFloat(commaSegs[1]!)),
      };
    }
  }

  const spaceParts = inner
    .split(/\s+/)
    .map(parseFloat)
    .filter(Number.isFinite);
  if (spaceParts.length >= 3) {
    return {
      color: rgbToPixiColor(spaceParts[0]!, spaceParts[1]!, spaceParts[2]!),
      alpha: spaceParts.length >= 4 ? clamp01(spaceParts[3]!) : 1,
    };
  }

  return { color: 0xffffff, alpha: 1 };
}

/** Stable sub-world jitter from id + index (readability only). */
function drawOffsetForEvent(id: string, index: number): { ox: number; oy: number } {
  let h = index * 17;
  for (let k = 0; k < id.length; k++) {
    h = (h * 31 + id.charCodeAt(k)) | 0;
  }
  const bx = (h & 7) - 3;
  const by = ((h >> 4) & 7) - 3;
  return { ox: bx * 0.18, oy: by * 0.18 };
}

/**
 * Renders stats events as Pixi circles in board world space (160×100 view box).
 * Stored positions are board-normalised nx, ny ∈ [0,1] (0–100% grid).
 */
const CROWDED_EVENT_THRESHOLD = 28;
const CROWDED_RADIUS_SCALE = 0.9;

export function drawStatsEventsGraphics(
  g: Graphics,
  events: readonly StatsLoggedEvent[],
  opts?: DrawStatsEventsOptions,
): void {
  g.clear();
  const scale = Math.max(opts?.worldToScreenScale ?? 1, 0.004);
  const minPx = opts?.minScreenRadiusPx ?? 3.35;
  const minWorldR = minPx / scale;
  const crowded = events.length >= CROWDED_EVENT_THRESHOLD;
  const separate =
    opts?.visualSeparation !== false &&
    !crowded;

  let i = 0;
  for (const ev of events) {
    const st = getStatsEventMarkerStyle(ev, opts);
    const p = boardNormToWorld(ev.nx, ev.ny);
    const { ox, oy } = separate ? drawOffsetForEvent(ev.id, i) : { ox: 0, oy: 0 };
    const x = p.x + ox;
    const y = p.y + oy;
    const rDraw = st.radius * (crowded ? CROWDED_RADIUS_SCALE : 1);
    const effR = Math.max(rDraw, minWorldR);
    const rMul = effR / Math.max(st.radius, 0.001);
    const sw = Math.min(1.2, st.strokeWidth * Math.min(1.12, rMul));
    const fillC = parseCssColorForPixi(st.fill);
    const strokeC = parseCssColorForPixi(st.stroke);
    if (st.shape === "cross") {
      const arm = effR * 1.05;
      g.moveTo(x - arm, y - arm)
        .lineTo(x + arm, y + arm)
        .moveTo(x + arm, y - arm)
        .lineTo(x - arm, y + arm)
        .stroke({ width: Math.max(sw, 1), color: strokeC.color, alpha: strokeC.alpha });
      g.circle(x, y, Math.max(0.8, effR * 0.34)).fill({
        color: fillC.color,
        alpha: Math.max(0.75, fillC.alpha * 0.85),
      });
    } else if (st.shape === "triangle") {
      const h = effR * 1.18;
      const w = effR * 1.05;
      g.poly([x, y - h, x + w, y + h * 0.72, x - w, y + h * 0.72])
        .fill({ color: fillC.color, alpha: fillC.alpha })
        .stroke({ width: sw, color: strokeC.color, alpha: strokeC.alpha });
    } else {
      g.circle(x, y, effR)
        .fill({ color: fillC.color, alpha: fillC.alpha })
        .stroke({ width: sw, color: strokeC.color, alpha: strokeC.alpha });
    }
    i += 1;
  }
}
