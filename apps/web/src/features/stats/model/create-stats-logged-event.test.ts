import { describe, expect, it } from "vitest";

import {
  createStatsLoggedEvent,
  type StatsFieldEventType,
  type StatsScoreType,
} from "@src/features/stats/model/stats-logged-event";

describe("createStatsLoggedEvent", () => {
  it("creates a field event with turnover_won and clamps coordinates", () => {
    const e = createStatsLoggedEvent({
      id: "id-1",
      selection: { domain: "field", fieldType: "turnover_won" },
      nx: 1.5,
      ny: -0.2,
      timestampMs: 1_700_000_000_000,
    });
    expect(e.domain).toBe("field");
    if (e.domain !== "field") throw new Error("narrow");
    expect(e.fieldType).toBe("turnover_won");
    expect(e.id).toBe("id-1");
    expect(e.nx).toBe(1);
    expect(e.ny).toBe(0);
    expect(e.timestampMs).toBe(1_700_000_000_000);
    expect(e.periodPhase).toBe("unspecified");
    expect(e.scorerId).toBeNull();
    expect(e.voiceNoteId).toBeNull();
    expect(e.teamContext).toBeNull();
  });

  it("creates a score event for two_point", () => {
    const e = createStatsLoggedEvent({
      id: "id-2",
      selection: { domain: "score", scoreType: "two_point" },
      nx: 0.25,
      ny: 0.75,
      timestampMs: 42,
      periodPhase: "first_half",
      scorerId: "player-9",
    });
    expect(e.domain).toBe("score");
    if (e.domain !== "score") throw new Error("narrow");
    expect(e.scoreType).toBe("two_point");
    expect(e.nx).toBe(0.25);
    expect(e.ny).toBe(0.75);
    expect(e.periodPhase).toBe("first_half");
    expect(e.scorerId).toBe("player-9");
  });

  it("supports every field type literal", () => {
    const types: StatsFieldEventType[] = [
      "turnover_won",
      "turnover_lost",
      "kickout_won",
      "kickout_lost",
      "free_won",
      "free_conceded",
      "wide",
      "shot",
    ];
    for (const fieldType of types) {
      const e = createStatsLoggedEvent({
        id: `id-${fieldType}`,
        selection: { domain: "field", fieldType },
        nx: 0.5,
        ny: 0.5,
        timestampMs: 0,
      });
      expect(e.domain).toBe("field");
      if (e.domain !== "field") throw new Error("narrow");
      expect(e.fieldType).toBe(fieldType);
    }
  });

  it("supports every score type literal", () => {
    const scoreTypes: StatsScoreType[] = ["goal", "point", "two_point"];
    for (const scoreType of scoreTypes) {
      const e = createStatsLoggedEvent({
        id: `id-${scoreType}`,
        selection: { domain: "score", scoreType },
        nx: 0.1,
        ny: 0.2,
        timestampMs: 0,
      });
      expect(e.domain).toBe("score");
      if (e.domain !== "score") throw new Error("narrow");
      expect(e.scoreType).toBe(scoreType);
    }
  });

  it("passes through optional voiceNoteId and teamContext", () => {
    const e = createStatsLoggedEvent({
      id: "id-v",
      selection: { domain: "field", fieldType: "wide" },
      nx: 0,
      ny: 1,
      timestampMs: 0,
      voiceNoteId: "vn-1",
      teamContext: "away",
    });
    expect(e.voiceNoteId).toBe("vn-1");
    expect(e.teamContext).toBe("away");
  });
});
