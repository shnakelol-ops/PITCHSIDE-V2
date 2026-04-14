import { Graphics, GraphicsPath } from "pixi.js";
import type { StrokeStyle } from "pixi.js";

import type { PitchMarking } from "@/config/pitchConfig";

/** One Pixi stroke language for every marking (lines, arcs, D, rects, circles). */
const STROKE_COMMON = {
  cap: "round" as const,
  join: "round" as const,
  alignment: 0.5 as const,
  miterLimit: 2,
} satisfies Pick<StrokeStyle, "cap" | "join" | "alignment" | "miterLimit">;

function snapHalf(v: number): number {
  return Math.round(v * 2) / 2;
}

function parseDashArray(s?: string): number[] | null {
  if (s == null || !s.trim()) return null;
  const parts = s.trim().split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n));
  return parts.length ? parts : null;
}

function strokeStyleFromMarking(m: {
  stroke?: string;
  strokeWidth?: number;
}): (StrokeStyle & { width: number; color: string }) | null {
  if (m.stroke == null || m.stroke === "none") return null;
  const width = m.strokeWidth ?? 0;
  if (width <= 0) return null;
  return { ...STROKE_COMMON, width, color: m.stroke };
}

function strokeDashedSegment(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: NonNullable<ReturnType<typeof strokeStyleFromMarking>>,
  dash: number[],
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return;
  const ux = dx / len;
  const uy = dy / len;
  let t = 0;
  let i = 0;
  const d = dash.length === 1 ? [dash[0]!, dash[0]!] : dash;
  while (t < len - 1e-9) {
    const seg = d[i % d.length]!;
    const t1 = Math.min(len, t + Math.max(1e-6, seg));
    if (i % 2 === 0) {
      g.moveTo(snapHalf(x1 + ux * t), snapHalf(y1 + uy * t))
        .lineTo(snapHalf(x1 + ux * t1), snapHalf(y1 + uy * t1))
        .stroke(style);
    }
    t = t1;
    i++;
  }
}

export type UnifiedPitchMarkingsOptions = {
  /** Skip these markings (e.g. render smooth arcs via canvas/SVG elsewhere). */
  skipMarking?: (m: PitchMarking) => boolean;
};

/**
 * All markings in one {@link Graphics} context: identical stroke cap/join/alignment for every primitive.
 * Paths matched by `skipMarking` are omitted so they can be drawn with a higher-fidelity raster path.
 */
export function createUnifiedPitchMarkingsGraphics(
  markings: readonly PitchMarking[],
  options?: UnifiedPitchMarkingsOptions,
): Graphics {
  const g = new Graphics({ roundPixels: true });
  g.label = "unifiedPitchMarkings";

  for (const m of markings) {
    if (options?.skipMarking?.(m)) continue;
    switch (m.kind) {
      case "line": {
        const st = strokeStyleFromMarking(m);
        if (!st) break;
        const x1 = snapHalf(m.x1);
        const y1 = snapHalf(m.y1);
        const x2 = snapHalf(m.x2);
        const y2 = snapHalf(m.y2);
        const dash = parseDashArray(m.strokeDasharray);
        if (dash?.length) {
          strokeDashedSegment(g, x1, y1, x2, y2, st, dash);
        } else {
          g.moveTo(x1, y1).lineTo(x2, y2).stroke(st);
        }
        break;
      }
      case "rect": {
        const x = snapHalf(m.x);
        const y = snapHalf(m.y);
        const w = snapHalf(m.w);
        const h = snapHalf(m.h);
        const fill =
          m.fill != null && m.fill !== "none" ? { color: m.fill } : undefined;
        const st = strokeStyleFromMarking(m);
        if (fill && st) {
          g.rect(x, y, w, h).fill(fill).stroke(st);
        } else if (fill) {
          g.rect(x, y, w, h).fill(fill);
        } else if (st) {
          g.rect(x, y, w, h).stroke(st);
        }
        break;
      }
      case "circle": {
        const cx = snapHalf(m.cx);
        const cy = snapHalf(m.cy);
        const r = snapHalf(m.r);
        const fill =
          m.fill != null && m.fill !== "none" ? { color: m.fill } : undefined;
        const st = strokeStyleFromMarking(m);
        if (fill && st) {
          g.circle(cx, cy, r).fill(fill).stroke(st);
        } else if (fill) {
          g.circle(cx, cy, r).fill(fill);
        } else if (st) {
          g.circle(cx, cy, r).stroke(st);
        }
        break;
      }
      case "ellipse": {
        const cx = snapHalf(m.cx);
        const cy = snapHalf(m.cy);
        const rx = snapHalf(m.rx);
        const ry = snapHalf(m.ry);
        const fill =
          m.fill != null && m.fill !== "none" ? { color: m.fill } : undefined;
        const st = strokeStyleFromMarking(m);
        if (fill && st) {
          g.ellipse(cx, cy, rx, ry).fill(fill).stroke(st);
        } else if (fill) {
          g.ellipse(cx, cy, rx, ry).fill(fill);
        } else if (st) {
          g.ellipse(cx, cy, rx, ry).stroke(st);
        }
        break;
      }
      case "path": {
        const st = strokeStyleFromMarking(m);
        const fill =
          m.fill != null && m.fill !== "none"
            ? { color: m.fill, alpha: m.opacity ?? 1 }
            : undefined;
        if (!st && !fill) break;
        const gp = new GraphicsPath(m.d);
        if (st && fill) g.path(gp).fill(fill).stroke(st);
        else if (st) g.path(gp).stroke(st);
        else g.path(gp).fill(fill!);
        break;
      }
      default:
        break;
    }
  }

  return g;
}
