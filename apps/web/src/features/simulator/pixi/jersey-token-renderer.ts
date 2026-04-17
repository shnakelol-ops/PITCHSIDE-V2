import { Container, Graphics, Text, TextStyle } from "pixi.js";

import type { MicroAthlete } from "@src/features/simulator/model/micro-athlete";

export type JerseyTokenPalette = {
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  numberColor: number;
  outlineColor: number;
  glowColor: number;
};

type JerseyTokenSyncOptions = {
  headingRad: number;
  numberLabel: string;
  palette: JerseyTokenPalette;
  selected: boolean;
  dragging: boolean;
  active: boolean;
  nowMs?: number;
};

const FALLBACK_HOME = {
  primaryColor: 0x0f766e,
  secondaryColor: 0x99f6e4,
  accentColor: 0x134e4a,
};

const FALLBACK_AWAY = {
  primaryColor: 0xb45309,
  secondaryColor: 0xffedd5,
  accentColor: 0x7c2d12,
};

function toRgb(color: number): { r: number; g: number; b: number } {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  };
}

function channelLuminance(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(color: number): number {
  const { r, g, b } = toRgb(color);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function deriveOutlineColor(primaryColor: number): number {
  return luminance(primaryColor) > 0.46 ? 0x111827 : 0xe5e7eb;
}

function deriveNumberColor(primaryColor: number): number {
  return luminance(primaryColor) > 0.5 ? 0x111827 : 0xf8fafc;
}

function deriveGlowColor(
  primaryColor: number,
  accentColor: number,
  team: MicroAthlete["team"],
): number {
  if (team === "home") return accentColor;
  return primaryColor;
}

function fallbackByTeam(team: MicroAthlete["team"]) {
  return team === "home" ? FALLBACK_HOME : FALLBACK_AWAY;
}

export function resolveJerseyTokenPalette(
  athlete: Pick<MicroAthlete, "team" | "jerseyStyle">,
): JerseyTokenPalette {
  const fallback = fallbackByTeam(athlete.team);
  const primaryColor = athlete.jerseyStyle?.primaryColor ?? fallback.primaryColor;
  const secondaryColor =
    athlete.jerseyStyle?.secondaryColor ?? fallback.secondaryColor;
  const accentColor = athlete.jerseyStyle?.accentColor ?? fallback.accentColor;
  const numberColor =
    athlete.jerseyStyle?.numberColor ?? deriveNumberColor(primaryColor);
  const outlineColor = deriveOutlineColor(primaryColor);
  const glowColor = deriveGlowColor(primaryColor, accentColor, athlete.team);
  return {
    primaryColor,
    secondaryColor,
    accentColor,
    numberColor,
    outlineColor,
    glowColor,
  };
}

export function resolveJerseyNumberLabel(
  athlete: Pick<MicroAthlete, "id" | "jerseyNumber">,
): string {
  if (athlete.jerseyNumber != null) {
    const label = String(athlete.jerseyNumber).trim();
    if (label.length > 0) return label.slice(0, 2);
  }
  const match = athlete.id.match(/(\d{1,2})$/);
  if (!match) return "?";
  return String(Number(match[1]));
}

function drawDirectionalPointer(
  g: Graphics,
  r: number,
  palette: JerseyTokenPalette,
): void {
  g.clear();
  g
    .moveTo(0, -r * 1.58)
    .lineTo(-r * 0.34, -r * 1.08)
    .lineTo(r * 0.34, -r * 1.08)
    .closePath()
    .fill({ color: palette.accentColor, alpha: 0.94 })
    .stroke({
      width: 0.12,
      color: palette.outlineColor,
      alpha: 0.46,
      join: "round",
    });
}

function drawJerseyStaticBody(
  g: Graphics,
  r: number,
  palette: JerseyTokenPalette,
): void {
  g.clear();

  g
    .moveTo(-r * 0.95, -r * 0.75)
    .lineTo(-r * 1.34, -r * 0.36)
    .lineTo(-r * 1.02, r * 0.12)
    .lineTo(-r * 0.66, r * 0.02)
    .lineTo(-r * 0.58, r * 1.06)
    .lineTo(r * 0.58, r * 1.06)
    .lineTo(r * 0.66, r * 0.02)
    .lineTo(r * 1.02, r * 0.12)
    .lineTo(r * 1.34, -r * 0.36)
    .lineTo(r * 0.95, -r * 0.75)
    .lineTo(r * 0.33, -r * 0.75)
    .lineTo(r * 0.18, -r * 0.53)
    .lineTo(-r * 0.18, -r * 0.53)
    .lineTo(-r * 0.33, -r * 0.75)
    .closePath()
    .fill({ color: palette.primaryColor, alpha: 1 })
    .stroke({
      width: 0.18,
      color: palette.outlineColor,
      alpha: 0.42,
      join: "round",
      cap: "round",
    });

  g
    .moveTo(-r * 0.3, -r * 0.64)
    .lineTo(-r * 0.18, -r * 0.47)
    .lineTo(r * 0.18, -r * 0.47)
    .lineTo(r * 0.3, -r * 0.64)
    .lineTo(r * 0.08, -r * 0.76)
    .lineTo(-r * 0.08, -r * 0.76)
    .closePath()
    .fill({ color: palette.accentColor, alpha: 0.92 });

  g
    .roundRect(-r * 0.42, -r * 0.35, r * 0.84, r * 1.2, r * 0.18)
    .fill({ color: palette.secondaryColor, alpha: 0.24 });

  g
    .moveTo(-r * 1.05, -r * 0.43)
    .lineTo(-r * 0.82, -r * 0.13)
    .lineTo(-r * 0.7, -r * 0.18)
    .lineTo(-r * 0.9, -r * 0.53)
    .closePath()
    .fill({ color: palette.secondaryColor, alpha: 0.44 });

  g
    .moveTo(r * 1.05, -r * 0.43)
    .lineTo(r * 0.82, -r * 0.13)
    .lineTo(r * 0.7, -r * 0.18)
    .lineTo(r * 0.9, -r * 0.53)
    .closePath()
    .fill({ color: palette.secondaryColor, alpha: 0.44 });
}

function drawShadowVariant(
  g: Graphics,
  r: number,
  variant: "idle" | "selected" | "dragging",
): void {
  g.clear();
  const dragging = variant === "dragging";
  const selected = variant === "selected";
  const liftY = dragging ? 0.18 : selected ? 0.08 : 0;
  const width = dragging ? r * 1.48 : selected ? r * 1.4 : r * 1.32;
  const height = dragging ? r * 0.5 : selected ? r * 0.46 : r * 0.42;
  const alpha = dragging ? 0.38 : selected ? 0.3 : 0.23;
  g.ellipse(0, r * 1.15 + liftY, width, height).fill({
    color: 0x020617,
    alpha,
  });
}

function drawRingVariant(
  g: Graphics,
  r: number,
  palette: JerseyTokenPalette,
  variant: "active" | "selected" | "dragging",
): void {
  g.clear();
  const dragging = variant === "dragging";
  const selected = variant === "selected";
  const ringRadius = r * 1.28;
  const width = dragging ? 0.24 : selected ? 0.2 : 0.16;
  const alpha = dragging ? 0.5 : selected ? 0.36 : 0.22;

  g.circle(0, 0, ringRadius).stroke({
    width,
    color: palette.glowColor,
    alpha,
  });

  if (selected || dragging) {
    g.circle(0, 0, ringRadius + 0.2).stroke({
      width: 0.1,
      color: 0xffffff,
      alpha: dragging ? 0.42 : 0.3,
    });
  }
}

export type JerseyTokenRenderer = {
  container: Container;
  badgeAnchor: Container;
  sync: (opts: JerseyTokenSyncOptions) => boolean;
  dispose: () => void;
};

export function createJerseyTokenRenderer(radiusWorld: number): JerseyTokenRenderer {
  const container = new Container();
  container.sortableChildren = true;

  const shadowIdle = new Graphics();
  shadowIdle.zIndex = 0;
  shadowIdle.cacheAsTexture(true);
  drawShadowVariant(shadowIdle, radiusWorld, "idle");

  const shadowSelected = new Graphics();
  shadowSelected.zIndex = 0;
  shadowSelected.cacheAsTexture(true);
  drawShadowVariant(shadowSelected, radiusWorld, "selected");
  shadowSelected.visible = false;

  const shadowDragging = new Graphics();
  shadowDragging.zIndex = 0;
  shadowDragging.cacheAsTexture(true);
  drawShadowVariant(shadowDragging, radiusWorld, "dragging");
  shadowDragging.visible = false;

  const ringActive = new Graphics();
  ringActive.zIndex = 1;
  ringActive.visible = false;

  const ringSelected = new Graphics();
  ringSelected.zIndex = 1;
  ringSelected.visible = false;

  const ringDragging = new Graphics();
  ringDragging.zIndex = 1;
  ringDragging.visible = false;

  const directionRoot = new Container();
  directionRoot.zIndex = 2;
  const direction = new Graphics();
  directionRoot.addChild(direction);

  const jersey = new Graphics();
  jersey.zIndex = 3;
  jersey.cacheAsTexture(true);

  const numberStyle = new TextStyle({
    fontFamily:
      "Inter, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
    fontWeight: "800",
    fontSize: radiusWorld * 1.05,
    align: "center",
    letterSpacing: 0.2,
  });
  const numberText = new Text({
    text: "?",
    style: numberStyle,
  });
  numberText.zIndex = 4;
  numberText.anchor.set(0.5);
  numberText.position.set(0, radiusWorld * 0.07);
  numberText.resolution = 2;

  // Reserved for future captain/scorer markers without changing the token API.
  const badgeAnchor = new Container();
  badgeAnchor.zIndex = 5;
  badgeAnchor.position.set(radiusWorld * 0.92, -radiusWorld * 0.98);

  container.addChild(shadowIdle);
  container.addChild(shadowSelected);
  container.addChild(shadowDragging);
  container.addChild(ringActive);
  container.addChild(ringSelected);
  container.addChild(ringDragging);
  container.addChild(directionRoot);
  container.addChild(jersey);
  container.addChild(numberText);
  container.addChild(badgeAnchor);

  let lastPrimary = Number.NaN;
  let lastSecondary = Number.NaN;
  let lastAccent = Number.NaN;
  let lastNumberColor = Number.NaN;
  let lastOutline = Number.NaN;
  let lastGlow = Number.NaN;
  let lastLabel = "";
  let lastHeadingRad = Number.NaN;
  let drawState = 0;

  const redrawStatic = (palette: JerseyTokenPalette, numberLabel: string) => {
    drawDirectionalPointer(direction, radiusWorld, palette);
    drawJerseyStaticBody(jersey, radiusWorld, palette);
    numberText.text = numberLabel;
    numberText.style.fill = palette.numberColor;
    numberText.style.stroke = {
      color: palette.outlineColor,
      width: 0.6,
    };
  };

  const sync = (opts: JerseyTokenSyncOptions): boolean => {
    if (opts.headingRad !== lastHeadingRad) {
      directionRoot.rotation = opts.headingRad;
      lastHeadingRad = opts.headingRad;
    }

    const paletteChanged =
      opts.palette.primaryColor !== lastPrimary ||
      opts.palette.secondaryColor !== lastSecondary ||
      opts.palette.accentColor !== lastAccent ||
      opts.palette.numberColor !== lastNumberColor ||
      opts.palette.outlineColor !== lastOutline ||
      opts.palette.glowColor !== lastGlow;
    if (paletteChanged || opts.numberLabel !== lastLabel) {
      lastPrimary = opts.palette.primaryColor;
      lastSecondary = opts.palette.secondaryColor;
      lastAccent = opts.palette.accentColor;
      lastNumberColor = opts.palette.numberColor;
      lastOutline = opts.palette.outlineColor;
      lastGlow = opts.palette.glowColor;
      lastLabel = opts.numberLabel;
      redrawStatic(opts.palette, opts.numberLabel);
      drawRingVariant(ringActive, radiusWorld, opts.palette, "active");
      drawRingVariant(ringSelected, radiusWorld, opts.palette, "selected");
      drawRingVariant(ringDragging, radiusWorld, opts.palette, "dragging");
    }

    const nextState = opts.dragging ? 2 : opts.selected ? 1 : opts.active ? 3 : 0;
    const statesChanged = nextState !== drawState;

    if (statesChanged) {
      drawState = nextState;
      const selected = opts.selected && !opts.dragging;
      const active = opts.active && !opts.selected && !opts.dragging;
      shadowIdle.visible = !selected && !opts.dragging;
      shadowSelected.visible = selected;
      shadowDragging.visible = opts.dragging;
      ringActive.visible = active;
      ringSelected.visible = selected;
      ringDragging.visible = opts.dragging;
    }

    return false;
  };

  return {
    container,
    badgeAnchor,
    sync,
    dispose: () => {
      container.destroy({ children: true });
    },
  };
}
