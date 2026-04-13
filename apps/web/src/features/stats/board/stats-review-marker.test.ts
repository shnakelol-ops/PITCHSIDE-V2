import { describe, expect, it } from "vitest";

import { getStatsEventMarkerStyle } from "@src/features/stats/board/stats-event-marker-style";
import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";

describe("review marker emphasis", () => {
  const base: Pick<
    StatsLoggedEvent,
    "nx" | "ny" | "timestampMs" | "periodPhase" | "playerId" | "voiceNoteId" | "teamContext"
  > = {
    nx: 0.5,
    ny: 0.5,
    timestampMs: 0,
    periodPhase: "unspecified",
    playerId: null,
    voiceNoteId: null,
    teamContext: null,
  };

  it("applies stronger emphasis to wides and shots than turnovers in HT review", () => {
    const wide: StatsLoggedEvent = { ...base, id: "w", kind: "WIDE" };
    const turnover: StatsLoggedEvent = { ...base, id: "t", kind: "TURNOVER_WON" };
    const w = getStatsEventMarkerStyle(wide, { reviewMode: "halftime" });
    const t = getStatsEventMarkerStyle(turnover, { reviewMode: "halftime" });
    expect(w.radius).toBeGreaterThan(t.radius);
  });

  it("free won vs shot vs goal are distinguishable under review", () => {
    const free: StatsLoggedEvent = { ...base, id: "f", kind: "FREE_WON" };
    const shot: StatsLoggedEvent = { ...base, id: "s", kind: "SHOT" };
    const goal: StatsLoggedEvent = { ...base, id: "g", kind: "GOAL", playerId: "p1" };
    const f = getStatsEventMarkerStyle(free, { reviewMode: "full_time" });
    const s = getStatsEventMarkerStyle(shot, { reviewMode: "full_time" });
    const g = getStatsEventMarkerStyle(goal, { reviewMode: "full_time" });
    expect(new Set([f.fill, s.fill, g.fill]).size).toBe(3);
  });

  it("live mode does not apply review radius boost for wides", () => {
    const wide: StatsLoggedEvent = { ...base, id: "w", kind: "WIDE" };
    const live = getStatsEventMarkerStyle(wide, { reviewMode: "live" });
    const ht = getStatsEventMarkerStyle(wide, { reviewMode: "halftime" });
    expect(ht.radius).toBeGreaterThan(live.radius);
  });
});
