import { describe, expect, it } from "vitest";

import { getStatsEventMarkerStyle } from "@src/features/stats/board/stats-event-marker-style";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";

const base = {
  nx: 0.5,
  ny: 0.5,
  timestampMs: 0,
  periodPhase: "unspecified" as const,
  scorerId: null,
  voiceNoteId: null,
  teamContext: null,
};

describe("getStatsEventMarkerStyle", () => {
  it("renders wide as red (architecture §3.1)", () => {
    const e: StatsLoggedEvent = { ...base, id: "1", domain: "field", fieldType: "wide" };
    const s = getStatsEventMarkerStyle(e);
    expect(s.fill).toMatch(/239|220/);
    expect(s.fill).toContain("68");
  });

  it("compact density shrinks markers without losing wide vs shot contrast", () => {
    const wide: StatsLoggedEvent = { ...base, id: "w", domain: "field", fieldType: "wide" };
    const shot: StatsLoggedEvent = { ...base, id: "s", domain: "field", fieldType: "shot" };
    const wc = getStatsEventMarkerStyle(wide, { density: "compact" });
    const sc = getStatsEventMarkerStyle(shot, { density: "compact" });
    const wl = getStatsEventMarkerStyle(wide, { density: "comfortable" });
    expect(wc.radius).toBeLessThan(wl.radius);
    expect(wc.fill).not.toBe(sc.fill);
  });

  it("renders shot distinctly from wide (blue stroke, not red fill)", () => {
    const wide: StatsLoggedEvent = { ...base, id: "w", domain: "field", fieldType: "wide" };
    const shot: StatsLoggedEvent = { ...base, id: "s", domain: "field", fieldType: "shot" };
    const sw = getStatsEventMarkerStyle(wide);
    const ss = getStatsEventMarkerStyle(shot);
    expect(sw.fill).not.toBe(ss.fill);
    expect(ss.stroke).toContain("37");
    expect(ss.stroke).toContain("99");
    expect(ss.stroke).toContain("235");
  });

  it("renders score events differently from field turnover", () => {
    const turnover: StatsLoggedEvent = {
      ...base,
      id: "t",
      domain: "field",
      fieldType: "turnover_won",
    };
    const goal: StatsLoggedEvent = {
      ...base,
      id: "g",
      domain: "score",
      scoreType: "goal",
    };
    const st = getStatsEventMarkerStyle(turnover);
    const sg = getStatsEventMarkerStyle(goal);
    expect(st.fill).not.toBe(sg.fill);
    expect(sg.fill).toContain("250");
    expect(sg.fill).toContain("204");
    expect(sg.fill).toContain("21");
  });

  it("uses stronger styling when score has scorerId (Phase 4)", () => {
    const bare: StatsLoggedEvent = {
      ...base,
      id: "a",
      domain: "score",
      scoreType: "goal",
      scorerId: null,
    };
    const tagged: StatsLoggedEvent = {
      ...base,
      id: "b",
      domain: "score",
      scoreType: "goal",
      scorerId: "player-1",
    };
    const sb = getStatsEventMarkerStyle(bare);
    const st = getStatsEventMarkerStyle(tagged);
    expect(st.strokeWidth).toBeGreaterThan(sb.strokeWidth);
  });

  it("differentiates goal vs point vs two_point", () => {
    const goal = getStatsEventMarkerStyle({
      ...base,
      id: "1",
      domain: "score",
      scoreType: "goal",
    });
    const point = getStatsEventMarkerStyle({
      ...base,
      id: "2",
      domain: "score",
      scoreType: "point",
    });
    const two = getStatsEventMarkerStyle({
      ...base,
      id: "3",
      domain: "score",
      scoreType: "two_point",
    });
    expect(new Set([goal.fill, point.fill, two.fill]).size).toBe(3);
  });
});
