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

describe("getStatsEventMarkerStyle review emphasis", () => {
  it("enlarges wides in halftime review (red clusters read from distance)", () => {
    const wide: StatsLoggedEvent = { ...base, id: "w", domain: "field", fieldType: "wide" };
    const live = getStatsEventMarkerStyle(wide);
    const ht = getStatsEventMarkerStyle(wide, { reviewMode: "halftime" });
    expect(ht.radius).toBeGreaterThan(live.radius);
    expect(ht.shadowBlur).toBeGreaterThanOrEqual(live.shadowBlur);
  });

  it("emphasizes turnovers in review vs live field default", () => {
    const turnover: StatsLoggedEvent = {
      ...base,
      id: "t",
      domain: "field",
      fieldType: "turnover_won",
    };
    const free: StatsLoggedEvent = { ...base, id: "f", domain: "field", fieldType: "free_won" };
    const tLive = getStatsEventMarkerStyle(turnover);
    const tHt = getStatsEventMarkerStyle(turnover, { reviewMode: "halftime" });
    const fHt = getStatsEventMarkerStyle(free, { reviewMode: "halftime" });
    expect(tHt.radius).toBeGreaterThan(tLive.radius);
    expect(tHt.radius).toBeGreaterThan(fHt.radius);
  });

  it("emphasizes shots in review", () => {
    const shot: StatsLoggedEvent = { ...base, id: "s", domain: "field", fieldType: "shot" };
    const live = getStatsEventMarkerStyle(shot);
    const ft = getStatsEventMarkerStyle(shot, { reviewMode: "full_time" });
    expect(ft.radius).toBeGreaterThan(live.radius);
  });

  it("boosts score markers in review while staying distinct from field", () => {
    const goal: StatsLoggedEvent = {
      ...base,
      id: "g",
      domain: "score",
      scoreType: "goal",
      scorerId: "p1",
    };
    const live = getStatsEventMarkerStyle(goal);
    const ht = getStatsEventMarkerStyle(goal, { reviewMode: "halftime" });
    expect(ht.radius).toBeGreaterThan(live.radius);
  });

  it("full_time emphasis is at least as strong as halftime for wides", () => {
    const wide: StatsLoggedEvent = { ...base, id: "w", domain: "field", fieldType: "wide" };
    const ht = getStatsEventMarkerStyle(wide, { reviewMode: "halftime" });
    const ft = getStatsEventMarkerStyle(wide, { reviewMode: "full_time" });
    expect(ft.radius).toBeGreaterThanOrEqual(ht.radius);
  });
});
