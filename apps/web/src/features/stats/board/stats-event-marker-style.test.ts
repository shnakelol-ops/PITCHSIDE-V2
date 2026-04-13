import { describe, expect, it } from "vitest";

import { getStatsEventMarkerStyle } from "@src/features/stats/board/stats-event-marker-style";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";

describe("getStatsEventMarkerStyle", () => {
  const base = {
    nx: 0.5,
    ny: 0.5,
    timestampMs: 0,
    periodPhase: "unspecified" as const,
    playerId: null,
    voiceNoteId: null,
    teamContext: null,
  };

  it("makes wides visually stronger than shots in review", () => {
    const e: StatsLoggedEvent = { ...base, id: "1", kind: "WIDE" };
    const wide = getStatsEventMarkerStyle(e, { reviewMode: "halftime" });
    const shot: StatsLoggedEvent = { ...base, id: "s", kind: "SHOT" };
    const shotSt = getStatsEventMarkerStyle(shot, { reviewMode: "halftime" });
    expect(wide.radius).toBeGreaterThan(shotSt.radius);
  });

  it("boosts wide + shot more than turnover in full_time review", () => {
    const wide: StatsLoggedEvent = { ...base, id: "w", kind: "WIDE" };
    const shot: StatsLoggedEvent = { ...base, id: "s", kind: "SHOT" };
    const turnover: StatsLoggedEvent = { ...base, id: "t", kind: "TURNOVER_WON" };
    const w = getStatsEventMarkerStyle(wide, { reviewMode: "full_time" });
    const s = getStatsEventMarkerStyle(shot, { reviewMode: "full_time" });
    const t = getStatsEventMarkerStyle(turnover, { reviewMode: "full_time" });
    expect(w.radius).toBeGreaterThan(t.radius);
    expect(s.radius).toBeGreaterThan(t.radius);
  });

  it("uses distinct score styles", () => {
    const goal: StatsLoggedEvent = { ...base, id: "g", kind: "GOAL" };
    const point: StatsLoggedEvent = { ...base, id: "p", kind: "POINT" };
    const tp: StatsLoggedEvent = { ...base, id: "tp", kind: "TWO_POINT" };
    const g = getStatsEventMarkerStyle(goal);
    const p = getStatsEventMarkerStyle(point);
    const t = getStatsEventMarkerStyle(tp);
    expect(g.fill).not.toBe(p.fill);
    expect(p.fill).not.toBe(t.fill);
  });

  it("uses stronger styling when score has playerId (Phase 4)", () => {
    const bare: StatsLoggedEvent = {
      ...base,
      id: "b",
      kind: "GOAL",
      playerId: null,
    };
    const tagged: StatsLoggedEvent = {
      ...base,
      id: "t",
      kind: "GOAL",
      playerId: "player-1",
    };
    const b = getStatsEventMarkerStyle(bare);
    const t = getStatsEventMarkerStyle(tagged);
    expect(t.radius).toBeGreaterThanOrEqual(b.radius);
    expect(t.strokeWidth).toBeGreaterThanOrEqual(b.strokeWidth);
  });

  it("shrinks markers in compact density", () => {
    const tw: StatsLoggedEvent = { ...base, id: "tw", kind: "TURNOVER_WON" };
    const kw: StatsLoggedEvent = { ...base, id: "kw", kind: "KICKOUT_WON" };
    const w: StatsLoggedEvent = { ...base, id: "w", kind: "WIDE" };
    expect(getStatsEventMarkerStyle(tw, { density: "compact" }).radius).toBeLessThan(
      getStatsEventMarkerStyle(tw).radius,
    );
    expect(getStatsEventMarkerStyle(kw, { density: "compact" }).radius).toBeLessThan(
      getStatsEventMarkerStyle(kw).radius,
    );
    expect(getStatsEventMarkerStyle(w, { density: "compact" }).radius).toBeLessThan(
      getStatsEventMarkerStyle(w).radius,
    );
  });

  it("halftime review enlarges scores vs live", () => {
    const goalLive: StatsLoggedEvent = { ...base, id: "g", kind: "GOAL" };
    const goalHt: StatsLoggedEvent = { ...base, id: "g2", kind: "GOAL" };
    const live = getStatsEventMarkerStyle(goalLive, { reviewMode: "live" });
    const ht = getStatsEventMarkerStyle(goalHt, { reviewMode: "halftime" });
    expect(ht.radius).toBeGreaterThan(live.radius);
  });
});
