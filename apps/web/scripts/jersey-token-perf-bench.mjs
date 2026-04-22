import { performance } from "node:perf_hooks";

import { Circle, Container, Graphics, Text, TextStyle } from "pixi.js";

const PLAYER_COUNT = 15;
const WARMUP_FRAMES = 250;
const SAMPLE_FRAMES = 3000;

const MICRO_ATHLETE_RADIUS_WORLD = 2.15;
const MICRO_ATHLETE_HIT_RADIUS_WORLD = 4.8;

function boardNormToWorld(nx, ny) {
  return {
    x: Math.min(1, Math.max(0, nx)) * 160,
    y: Math.min(1, Math.max(0, ny)) * 100,
  };
}

function createPlayers() {
  const out = [];
  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const team = i < Math.ceil(PLAYER_COUNT / 2) ? "home" : "away";
    out.push({
      id: `ma-${i + 1}`,
      nx: 0.18 + (i % 5) * 0.15,
      ny: 0.2 + Math.floor(i / 5) * 0.2,
      headingRad: (i * Math.PI) / 9,
      team,
      jerseyNumber: i + 1,
      jerseyStyle:
        team === "home"
          ? {
              primaryColor: 0x0f766e,
              secondaryColor: 0x99f6e4,
              accentColor: 0x134e4a,
            }
          : {
              primaryColor: 0xb45309,
              secondaryColor: 0xffedd5,
              accentColor: 0x7c2d12,
            },
    });
  }
  return out;
}

function createLegacyView() {
  const R = MICRO_ATHLETE_RADIUS_WORLD;
  const HALO_RADIUS = R * 1.34;
  const AURA_RADIUS = R * 1.08;
  const FIN_BASE_X = R * 0.56;
  const FIN_TIP_X = R * 1.72;
  const FIN_HALF_Y = R * 0.34;

  const SCALE_IDLE = 1;
  const SCALE_SELECTED = 1.065;
  const SCALE_DRAGGING = 1.05;
  const SCALE_LERP = 0.26;

  const teamPalette = (team) =>
    team === "home"
      ? {
          teamColor: 0x22d3a7,
          auraColor: 0x6ee7b7,
          finColor: 0x34d399,
          finStroke: 0xd1fae5,
          bodyFill: 0xe2e8f0,
          bodyShade: 0x94a3b8,
          headFill: 0xf8fafc,
          outline: 0x0f172a,
        }
      : {
          teamColor: 0xf97316,
          auraColor: 0xfb923c,
          finColor: 0xfb923c,
          finStroke: 0xffedd5,
          bodyFill: 0xffedd5,
          bodyShade: 0xfca5a5,
          headFill: 0xfffbeb,
          outline: 0x7c2d12,
        };

  const drawSilhouette = (g, palette) => {
    g.clear();
    g.moveTo(-0.3 * R, 0.82 * R);
    g.lineTo(-0.2 * R, 0.22 * R);
    g.quadraticCurveTo(-0.12 * R, -0.16 * R, 0.18 * R, -0.36 * R);
    g.quadraticCurveTo(0.45 * R, -0.12 * R, 0.5 * R, 0.24 * R);
    g.lineTo(0.36 * R, 0.86 * R);
    g.lineTo(0.1 * R, 0.92 * R);
    g.lineTo(-0.08 * R, 0.9 * R);
    g.closePath();
    g.fill({ color: palette.bodyFill, alpha: 0.96 });
    g.stroke({
      width: 0.18,
      color: palette.outline,
      alpha: 0.45,
      join: "round",
      cap: "round",
    });

    g
      .circle(0.22 * R, -0.56 * R, 0.24 * R)
      .fill({ color: palette.headFill, alpha: 0.98 })
      .stroke({ width: 0.12, color: palette.outline, alpha: 0.38 });

    g
      .ellipse(0.18 * R, 0.26 * R, 0.32 * R, 0.52 * R)
      .fill({ color: palette.bodyShade, alpha: 0.22 });
  };

  const drawHalo = (g, palette) => {
    g.clear();
    g.circle(0, 0, HALO_RADIUS).fill({ color: palette.teamColor, alpha: 0.3 });
    g.circle(0, 0, HALO_RADIUS * 0.7).fill({ color: palette.teamColor, alpha: 0.2 });
    g.circle(0, 0, HALO_RADIUS * 0.46).fill({ color: 0xffffff, alpha: 0.08 });
  };

  const drawAura = (g, palette, selected, dragging) => {
    g.clear();
    const alpha = dragging ? 0.95 : selected ? 0.88 : 0.8;
    g.circle(0, 0, AURA_RADIUS).stroke({
      width: 0.22,
      color: palette.auraColor,
      alpha,
    });
    g.circle(0, 0, AURA_RADIUS + 0.22).stroke({
      width: 0.1,
      color: 0xffffff,
      alpha: selected ? 0.58 : 0.34,
    });
  };

  const drawDirectionalFin = (g, palette) => {
    g.clear();
    g
      .moveTo(FIN_BASE_X, -FIN_HALF_Y)
      .lineTo(FIN_BASE_X, FIN_HALF_Y)
      .lineTo(FIN_TIP_X, 0)
      .closePath()
      .fill({ color: palette.finColor, alpha: 0.9 });

    g
      .moveTo(FIN_BASE_X, -FIN_HALF_Y)
      .lineTo(FIN_BASE_X, FIN_HALF_Y)
      .lineTo(FIN_TIP_X, 0)
      .closePath()
      .stroke({
        width: 0.14,
        color: palette.finStroke,
        alpha: 0.72,
        join: "round",
      });
  };

  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";

  const halo = new Graphics();
  halo.zIndex = 0;
  halo.cacheAsBitmap = true;

  const aura = new Graphics();
  aura.zIndex = 1;
  aura.cacheAsBitmap = true;

  const directionalFinRoot = new Container();
  directionalFinRoot.zIndex = 2;
  const directionalFin = new Graphics();
  directionalFinRoot.addChild(directionalFin);

  const silhouette = new Graphics();
  silhouette.zIndex = 3;

  container.addChild(halo);
  container.addChild(aura);
  container.addChild(directionalFinRoot);
  container.addChild(silhouette);

  const hitRadius = Math.max(MICRO_ATHLETE_HIT_RADIUS_WORLD, HALO_RADIUS * 2);
  container.hitArea = new Circle(0, 0, hitRadius);

  let palette = teamPalette("home");
  let lastTeam = "home";
  let lastSelected = false;
  let lastDragging = false;

  const redrawStaticLayers = (team) => {
    palette = teamPalette(team);
    drawHalo(halo, palette);
    drawDirectionalFin(directionalFin, palette);
    drawSilhouette(silhouette, palette);
  };

  const redrawAuraLayer = (selected, dragging) => {
    drawAura(aura, palette, selected, dragging);
  };

  redrawStaticLayers("home");
  redrawAuraLayer(false, false);

  const sync = (athlete, selected, dragging, nowMs) => {
    const { x, y } = boardNormToWorld(athlete.nx, athlete.ny);
    container.position.set(x, y);
    directionalFinRoot.rotation = athlete.headingRad;

    if (lastTeam !== athlete.team) {
      lastTeam = athlete.team;
      redrawStaticLayers(athlete.team);
      redrawAuraLayer(selected, dragging);
      lastSelected = selected;
      lastDragging = dragging;
    }

    if (lastSelected !== selected || lastDragging !== dragging) {
      lastSelected = selected;
      lastDragging = dragging;
      redrawAuraLayer(selected, dragging);
    }

    const baseTarget = dragging
      ? SCALE_DRAGGING
      : selected
        ? SCALE_SELECTED
        : SCALE_IDLE;
    const t = nowMs * 0.001;
    const idleBreath =
      dragging || selected ? 0.006 * Math.sin(t * 1.15) : 0.016 * Math.sin(t * 1.05);
    const scaleTarget = baseTarget * (1 + idleBreath);
    const s = container.scale.x;
    const next = s + (scaleTarget - s) * SCALE_LERP;
    container.scale.set(next);
    container.zIndex = selected ? 120 : 0;
    return Math.abs(next - scaleTarget) > 0.004;
  };

  return {
    container,
    sync,
    dispose: () => container.destroy({ children: true }),
  };
}

function createJerseyView() {
  const R = MICRO_ATHLETE_RADIUS_WORLD;
  const SCALE_IDLE = 1;
  const SCALE_SELECTED = 1.055;
  const SCALE_DRAGGING = 1.075;
  const SCALE_ACTIVE = 1;
  const SCALE_LERP = 0.24;

  const toRgb = (color) => ({
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  });
  const channelLuminance = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (color) => {
    const { r, g, b } = toRgb(color);
    return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
  };
  const fallbackByTeam = (team) =>
    team === "home"
      ? { primaryColor: 0x0f766e, secondaryColor: 0x99f6e4, accentColor: 0x134e4a }
      : { primaryColor: 0xb45309, secondaryColor: 0xffedd5, accentColor: 0x7c2d12 };
  const resolvePalette = (athlete) => {
    const fallback = fallbackByTeam(athlete.team);
    const primaryColor = athlete.jerseyStyle?.primaryColor ?? fallback.primaryColor;
    const secondaryColor = athlete.jerseyStyle?.secondaryColor ?? fallback.secondaryColor;
    const accentColor = athlete.jerseyStyle?.accentColor ?? fallback.accentColor;
    const numberColor =
      athlete.jerseyStyle?.numberColor ?? (luminance(primaryColor) > 0.5 ? 0x111827 : 0xf8fafc);
    const outlineColor = luminance(primaryColor) > 0.46 ? 0x111827 : 0xe5e7eb;
    return {
      primaryColor,
      secondaryColor,
      accentColor,
      numberColor,
      outlineColor,
      glowColor: athlete.team === "home" ? accentColor : primaryColor,
    };
  };
  const resolveLabel = (athlete) => {
    if (athlete.jerseyNumber != null) return String(athlete.jerseyNumber).slice(0, 2);
    const match = athlete.id.match(/(\d{1,2})$/);
    return match ? String(Number(match[1])) : "?";
  };

  const drawDirectionalPointer = (g, palette) => {
    g.clear();
    g
      .moveTo(0, -R * 1.58)
      .lineTo(-R * 0.34, -R * 1.08)
      .lineTo(R * 0.34, -R * 1.08)
      .closePath()
      .fill({ color: palette.accentColor, alpha: 0.94 })
      .stroke({
        width: 0.12,
        color: palette.outlineColor,
        alpha: 0.46,
        join: "round",
      });
  };

  const drawJerseyStaticBody = (g, palette) => {
    g.clear();
    g
      .moveTo(-R * 0.95, -R * 0.75)
      .lineTo(-R * 1.34, -R * 0.36)
      .lineTo(-R * 1.02, R * 0.12)
      .lineTo(-R * 0.66, R * 0.02)
      .lineTo(-R * 0.58, R * 1.06)
      .lineTo(R * 0.58, R * 1.06)
      .lineTo(R * 0.66, R * 0.02)
      .lineTo(R * 1.02, R * 0.12)
      .lineTo(R * 1.34, -R * 0.36)
      .lineTo(R * 0.95, -R * 0.75)
      .lineTo(R * 0.33, -R * 0.75)
      .lineTo(R * 0.18, -R * 0.53)
      .lineTo(-R * 0.18, -R * 0.53)
      .lineTo(-R * 0.33, -R * 0.75)
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
      .moveTo(-R * 0.3, -R * 0.64)
      .lineTo(-R * 0.18, -R * 0.47)
      .lineTo(R * 0.18, -R * 0.47)
      .lineTo(R * 0.3, -R * 0.64)
      .lineTo(R * 0.08, -R * 0.76)
      .lineTo(-R * 0.08, -R * 0.76)
      .closePath()
      .fill({ color: palette.accentColor, alpha: 0.92 });
    g
      .roundRect(-R * 0.42, -R * 0.35, R * 0.84, R * 1.2, R * 0.18)
      .fill({ color: palette.secondaryColor, alpha: 0.24 });
  };

  const drawShadowVariant = (g, variant) => {
    g.clear();
    const dragging = variant === "dragging";
    const selected = variant === "selected";
    const liftY = dragging ? 0.18 : selected ? 0.08 : 0;
    const width = dragging ? R * 1.48 : selected ? R * 1.4 : R * 1.32;
    const height = dragging ? R * 0.5 : selected ? R * 0.46 : R * 0.42;
    const alpha = dragging ? 0.38 : selected ? 0.3 : 0.23;
    g.ellipse(0, R * 1.15 + liftY, width, height).fill({ color: 0x020617, alpha });
  };

  const drawRingVariant = (g, palette, variant) => {
    g.clear();
    const dragging = variant === "dragging";
    const selected = variant === "selected";
    const ringRadius = R * 1.28;
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
  };

  const container = new Container();
  container.sortableChildren = true;
  container.eventMode = "static";
  const token = new Container();
  token.sortableChildren = true;
  container.addChild(token);

  const shadowIdle = new Graphics();
  shadowIdle.zIndex = 0;
  shadowIdle.cacheAsTexture(true);
  drawShadowVariant(shadowIdle, "idle");
  const shadowSelected = new Graphics();
  shadowSelected.zIndex = 0;
  shadowSelected.cacheAsTexture(true);
  drawShadowVariant(shadowSelected, "selected");
  shadowSelected.visible = false;
  const shadowDragging = new Graphics();
  shadowDragging.zIndex = 0;
  shadowDragging.cacheAsTexture(true);
  drawShadowVariant(shadowDragging, "dragging");
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
    fontFamily: "Inter, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
    fontWeight: "800",
    fontSize: R * 1.05,
    align: "center",
    letterSpacing: 0.2,
  });
  const numberText = new Text({ text: "?", style: numberStyle });
  numberText.style.strokeThickness = 0.6;
  numberText.anchor.set(0.5);
  numberText.position.set(0, R * 0.07);
  numberText.resolution = 2;
  numberText.zIndex = 4;

  token.addChild(shadowIdle);
  token.addChild(shadowSelected);
  token.addChild(shadowDragging);
  token.addChild(ringActive);
  token.addChild(ringSelected);
  token.addChild(ringDragging);
  token.addChild(directionRoot);
  token.addChild(jersey);
  token.addChild(numberText);
  container.hitArea = new Circle(0, 0, Math.max(MICRO_ATHLETE_HIT_RADIUS_WORLD, R * 2));

  let lastPrimary = Number.NaN;
  let lastSecondary = Number.NaN;
  let lastAccent = Number.NaN;
  let lastNumberColor = Number.NaN;
  let lastOutline = Number.NaN;
  let lastGlow = Number.NaN;
  let lastLabel = "";
  let lastSelected = false;
  let lastDragging = false;
  let lastActive = false;
  let lastHeadingRad = Number.NaN;

  const sync = (athlete, selected, dragging, nowMs) => {
    const { x, y } = boardNormToWorld(athlete.nx, athlete.ny);
    container.position.set(x, y);
    if (athlete.headingRad !== lastHeadingRad) {
      directionRoot.rotation = athlete.headingRad;
      lastHeadingRad = athlete.headingRad;
    }

    const active = false;
    const palette = resolvePalette(athlete);
    const label = resolveLabel(athlete);
    const paletteChanged =
      palette.primaryColor !== lastPrimary ||
      palette.secondaryColor !== lastSecondary ||
      palette.accentColor !== lastAccent ||
      palette.numberColor !== lastNumberColor ||
      palette.outlineColor !== lastOutline ||
      palette.glowColor !== lastGlow;

    if (paletteChanged || label !== lastLabel) {
      lastPrimary = palette.primaryColor;
      lastSecondary = palette.secondaryColor;
      lastAccent = palette.accentColor;
      lastNumberColor = palette.numberColor;
      lastOutline = palette.outlineColor;
      lastGlow = palette.glowColor;
      lastLabel = label;
      drawDirectionalPointer(direction, palette);
      drawJerseyStaticBody(jersey, palette);
      numberText.text = label;
      numberText.style.fill = palette.numberColor;
      numberText.style.stroke = palette.outlineColor;
      numberText.style.strokeThickness = 0.6;
      drawRingVariant(ringActive, palette, "active");
      drawRingVariant(ringSelected, palette, "selected");
      drawRingVariant(ringDragging, palette, "dragging");
      lastSelected = !selected;
      lastDragging = !dragging;
      lastActive = !active;
    }

    const statesChanged =
      selected !== lastSelected ||
      dragging !== lastDragging ||
      active !== lastActive;
    if (statesChanged) {
      lastSelected = selected;
      lastDragging = dragging;
      lastActive = active;
      const selectedOnly = selected && !dragging;
      const activeOnly = active && !selected && !dragging;
      shadowIdle.visible = !selectedOnly && !dragging;
      shadowSelected.visible = selectedOnly;
      shadowDragging.visible = dragging;
      ringActive.visible = activeOnly;
      ringSelected.visible = selectedOnly;
      ringDragging.visible = dragging;
    }

    const target = dragging ? SCALE_DRAGGING : selected ? SCALE_SELECTED : active ? SCALE_ACTIVE : SCALE_IDLE;
    const s = container.scale.x;
    const next = s + (target - s) * SCALE_LERP;
    container.scale.set(next);
    container.zIndex = selected ? 120 : 0;
    return false || Math.abs(next - target) > 0.003;
  };

  return {
    container,
    sync,
    dispose: () => container.destroy({ children: true }),
  };
}

function runScenario(name, createView, mode) {
  const views = Array.from({ length: PLAYER_COUNT }, () => createView());
  const players = createPlayers();
  const root = new Container();
  for (const v of views) root.addChild(v.container);

  const run = (frameCount) => {
    const t0 = performance.now();
    for (let frame = 0; frame < frameCount; frame += 1) {
      const nowMs = frame * 16.667;
      for (let i = 0; i < PLAYER_COUNT; i += 1) {
        const a = players[i];
        const phase = frame * 0.03 + i * 0.22;
        if (mode === "motion") {
          a.nx = Math.min(0.95, Math.max(0.05, a.nx + Math.sin(phase) * 0.0012));
          a.ny = Math.min(0.95, Math.max(0.05, a.ny + Math.cos(phase * 1.13) * 0.001));
          a.headingRad += Math.sin(phase * 0.9) * 0.018;
        }
        const selected = i === frame % PLAYER_COUNT;
        const dragging = selected && frame % 180 > 152;
        views[i].sync(a, selected, dragging, nowMs);
      }
    }
    return performance.now() - t0;
  };

  run(WARMUP_FRAMES);
  const elapsedMs = run(SAMPLE_FRAMES);
  const frameMs = elapsedMs / SAMPLE_FRAMES;
  const fps = 1000 / frameMs;

  for (const v of views) v.dispose();
  root.destroy({ children: true });

  return { name, mode, elapsedMs, frameMs, fps };
}

function printResult(r) {
  console.log(
    `${r.name.padEnd(20)} | ${r.mode.padEnd(6)} | ${r.fps.toFixed(2).padStart(8)} fps | ${r.frameMs.toFixed(4).padStart(8)} ms/frame`,
  );
}

const legacyIdle = runScenario("legacy-token", createLegacyView, "idle");
const jerseyIdle = runScenario("jersey-token", createJerseyView, "idle");
const legacyMotion = runScenario("legacy-token", createLegacyView, "motion");
const jerseyMotion = runScenario("jersey-token", createJerseyView, "motion");

console.log("Renderer benchmark (CPU micro-benchmark, 15 players)");
printResult(legacyIdle);
printResult(jerseyIdle);
printResult(legacyMotion);
printResult(jerseyMotion);

const idleDropPct = ((legacyIdle.fps - jerseyIdle.fps) / legacyIdle.fps) * 100;
const motionDropPct = ((legacyMotion.fps - jerseyMotion.fps) / legacyMotion.fps) * 100;

console.log("");
console.log(`Idle FPS delta:   ${idleDropPct.toFixed(2)}% (positive = jersey slower)`);
console.log(`Motion FPS delta: ${motionDropPct.toFixed(2)}% (positive = jersey slower)`);

if (idleDropPct > 5 || motionDropPct > 5) {
  console.log("RESULT: regression >5% detected");
  process.exitCode = 2;
} else {
  console.log("RESULT: within 5% budget");
}
