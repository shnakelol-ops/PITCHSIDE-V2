import type { PitchMarking } from "@/config/pitchConfig";
import { boardLines } from "@/lib/board-tokens";
import { BOARD_PITCH_VIEWBOX } from "@src/constants/pitch-space";

const Lg = boardLines.gaelic;

/** Matches `wHalf` on the halfway line in `pitchConfig` Gaelic landscape — shared stroke weight for unity. */
const STRUCTURE_LINE_WIDTH = 0.6;

function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Same turf cut for every marking — identical formula to straight lines (no extra width on curves). */
const TURF_CUT_STROKE = "rgba(2, 16, 11, 0.48)";
const UNDERLAY_WIDTH_EXTRA = 0.26;

function isArc2PointPath(m: PitchMarking): boolean {
  return m.kind === "path" && m.stroke === Lg.arc2Point;
}

/** Gaelic / hurling D at 20 m — authored with `lineCentre` + `skipLineGlow` (no soccer paths match). */
function isGaelicDFreePath(m: PitchMarking): boolean {
  if (m.kind !== "path") return false;
  const w = m.strokeWidth ?? 0;
  return (
    m.stroke === Lg.lineCentre &&
    m.skipLineGlow === true &&
    m.opacity == null &&
    w >= 0.55 &&
    w <= 0.68
  );
}

function isGaelicStructureCurvePath(m: PitchMarking): boolean {
  return isArc2PointPath(m) || isGaelicDFreePath(m);
}

/** Main centre circle (Gaelic ~3 m radius in vb ≈ 3.2 — not spots or penalty discs). */
function isMainCentreCircle(m: PitchMarking): boolean {
  return (
    m.kind === "circle" &&
    m.fill == null &&
    m.stroke === Lg.lineGridMid &&
    (m.strokeWidth ?? 0) >= 0.44 &&
    (m.strokeWidth ?? 0) <= 0.52 &&
    m.r > 2.2 &&
    m.r < 5.5
  );
}

function emitUnderlayFragment(m: PitchMarking): string | null {
  const cut = TURF_CUT_STROKE;
  const ew = UNDERLAY_WIDTH_EXTRA;
  switch (m.kind) {
    case "line": {
      const dash = m.strokeDasharray
        ? ` stroke-dasharray="${escAttr(m.strokeDasharray)}"`
        : "";
      return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="${cut}" stroke-width="${m.strokeWidth + ew}"${dash}/>`;
    }
    case "rect": {
      if (!m.stroke || m.strokeWidth <= 0) return null;
      return `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="none" stroke="${cut}" stroke-width="${m.strokeWidth + ew}"/>`;
    }
    case "circle": {
      if (m.stroke == null || (m.strokeWidth ?? 0) <= 0) return null;
      const uw =
        (isMainCentreCircle(m) ? STRUCTURE_LINE_WIDTH : (m.strokeWidth ?? 0)) + ew;
      return `<circle cx="${m.cx}" cy="${m.cy}" r="${m.r}" fill="none" stroke="${cut}" stroke-width="${uw}"/>`;
    }
    case "ellipse":
      return `<ellipse cx="${m.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}" fill="none" stroke="${cut}" stroke-width="${m.strokeWidth + ew}"/>`;
    case "path": {
      const fill = m.fill ? ` fill="${escAttr(m.fill)}"` : ` fill="none"`;
      const dash = m.strokeDasharray
        ? ` stroke-dasharray="${escAttr(m.strokeDasharray)}"`
        : "";
      const cap = m.strokeLinecap ? ` stroke-linecap="${m.strokeLinecap}"` : "";
      const uw = isGaelicStructureCurvePath(m)
        ? STRUCTURE_LINE_WIDTH + ew
        : m.strokeWidth + ew;
      return `<path d="${escAttr(m.d)}" stroke="${cut}" stroke-width="${uw}"${fill}${dash}${cap}/>`;
    }
    default:
      return null;
  }
}

function emitFaceFragment(m: PitchMarking): string | null {
  switch (m.kind) {
    case "line": {
      const dash = m.strokeDasharray
        ? ` stroke-dasharray="${escAttr(m.strokeDasharray)}"`
        : "";
      return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="${escAttr(m.stroke)}" stroke-width="${m.strokeWidth}"${dash}/>`;
    }
    case "rect": {
      const fill = m.fill ? ` fill="${escAttr(m.fill)}"` : ` fill="none"`;
      return `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}"${fill} stroke="${escAttr(m.stroke)}" stroke-width="${m.strokeWidth}"/>`;
    }
    case "circle": {
      const fill = m.fill ? ` fill="${escAttr(m.fill)}"` : ` fill="none"`;
      let strokeColor = m.stroke;
      let sw = m.strokeWidth ?? 0;
      if (isMainCentreCircle(m)) {
        strokeColor = Lg.lineCentre;
        sw = STRUCTURE_LINE_WIDTH;
      }
      const stroke =
        strokeColor != null && sw > 0
          ? ` stroke="${escAttr(strokeColor)}" stroke-width="${sw}"`
          : ` stroke="none"`;
      return `<circle cx="${m.cx}" cy="${m.cy}" r="${m.r}"${fill}${stroke}/>`;
    }
    case "ellipse": {
      const fill = m.fill ? ` fill="${escAttr(m.fill)}"` : ` fill="none"`;
      return `<ellipse cx="${m.cx}" cy="${m.cy}" rx="${m.rx}" ry="${m.ry}"${fill} stroke="${escAttr(m.stroke)}" stroke-width="${m.strokeWidth}"/>`;
    }
    case "path": {
      const fill = m.fill ? ` fill="${escAttr(m.fill)}"` : ` fill="none"`;
      const dash = m.strokeDasharray
        ? ` stroke-dasharray="${escAttr(m.strokeDasharray)}"`
        : "";
      const cap = m.strokeLinecap ? ` stroke-linecap="${m.strokeLinecap}"` : "";
      let strokeW = m.strokeWidth;
      let strokeCol = m.stroke;
      let op = m.opacity != null ? ` opacity="${m.opacity}"` : "";
      if (isArc2PointPath(m)) {
        strokeW = STRUCTURE_LINE_WIDTH;
        strokeCol = Lg.arc2Point;
        op = "";
      } else if (isGaelicDFreePath(m)) {
        strokeW = STRUCTURE_LINE_WIDTH;
        strokeCol = Lg.lineCentre;
        op = "";
      }
      return `<path d="${escAttr(m.d)}" stroke="${escAttr(strokeCol)}" stroke-width="${strokeW}"${fill}${dash}${cap}${op}/>`;
    }
    case "text": {
      const anchor = m.textAnchor ?? "start";
      const weight = m.fontWeight ?? "normal";
      const op = m.opacity != null ? ` opacity="${m.opacity}"` : "";
      return `<text x="${m.x}" y="${m.y}" font-size="${m.fontSize}" fill="${escAttr(m.fill)}" font-weight="${weight}" text-anchor="${anchor}"${op}>${escAttr(m.text)}</text>`;
    }
    default:
      return null;
  }
}

function wrapSvg(inner: string): string {
  const { w, h } = BOARD_PITCH_VIEWBOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="geometricPrecision"><g fill="none" stroke-linejoin="round" stroke-linecap="round" stroke-miterlimit="2">${inner}</g></svg>`;
}

/** Turf-cut underlay — full marking set in one SVG (same rasterisation as straight lines). */
export function buildPremiumMarkingsTurfUnderlaySvg(
  markings: readonly PitchMarking[],
): string {
  const parts: string[] = [];
  for (const m of markings) {
    const p = emitUnderlayFragment(m);
    if (p) parts.push(p);
  }
  return wrapSvg(parts.join(""));
}

/** Face paint — single SVG pass including 2-point arc + D elliptical arcs. */
export function buildPremiumMarkingsFaceSvg(markings: readonly PitchMarking[]): string {
  const parts: string[] = [];
  for (const m of markings) {
    const p = emitFaceFragment(m);
    if (p) parts.push(p);
  }
  return wrapSvg(parts.join(""));
}

/**
 * @deprecated Use underlay + face in {@link PremiumPitchRenderer}.
 */
export function buildPremiumMarkingsSvg(markings: readonly PitchMarking[]): string {
  return buildPremiumMarkingsFaceSvg(markings);
}
