import { describe, expect, it } from "vitest";

import {
  createStatsLoggedEvent,
  type StatsLoggedEvent,
} from "@src/features/stats/model/stats-logged-event";
import {
  STATS_V1_FIELD_KINDS,
  STATS_V1_SCORE_KINDS,
} from "@src/features/stats/model/stats-v1-event-kind";

describe("createStatsLoggedEvent", () => {
  it("creates a field event with clamped coordinates", () => {
    const e = createStatsLoggedEvent({
      kind: "TURNOVER_WON",
      nx: 1.5,
      ny: -0.2,
      timestampMs: 12_345,
      id: "evt-1",
    });
    expect(e.kind).toBe("TURNOVER_WON");
    expect(e.nx).toBe(1);
    expect(e.ny).toBe(0);
    expect(e.timestampMs).toBe(12_345);
    expect(e.playerId).toBeNull();
    expect(e.voiceNoteId).toBeNull();
  });

  it("creates a score event with optional playerId", () => {
    const e = createStatsLoggedEvent({
      kind: "TWO_POINT",
      nx: 0.5,
      ny: 0.5,
      timestampMs: 99,
      id: "evt-2",
      playerId: "player-9",
    });
    expect(e.kind).toBe("TWO_POINT");
    expect(e.playerId).toBe("player-9");
  });

  it("covers every V1 field kind", () => {
    for (const kind of STATS_V1_FIELD_KINDS) {
      const e = createStatsLoggedEvent({
        id: `id-${kind}`,
        kind,
        nx: 0.2,
        ny: 0.8,
        timestampMs: 1,
      });
      const row: StatsLoggedEvent = e;
      expect(row.kind).toBe(kind);
    }
  });

  it("covers every V1 score kind", () => {
    for (const kind of STATS_V1_SCORE_KINDS) {
      const e = createStatsLoggedEvent({
        id: `id-${kind}`,
        kind,
        nx: 0.1,
        ny: 0.1,
        timestampMs: 2,
      });
      expect(e.kind).toBe(kind);
    }
  });

  it("defaults period phase and ids", () => {
    const e = createStatsLoggedEvent({
      kind: "WIDE",
      nx: 0,
      ny: 0,
      timestampMs: 0,
    });
    expect(e.periodPhase).toBe("unspecified");
    expect(e.id.length).toBeGreaterThan(4);
  });
});
