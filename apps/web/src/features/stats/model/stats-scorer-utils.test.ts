import { describe, expect, it } from "vitest";

import { createStatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import {
  assignScorerToEvents,
  findLatestScorePendingScorer,
} from "@src/features/stats/model/stats-scorer-utils";

const field = createStatsLoggedEvent({
  id: "f1",
  kind: "WIDE",
  nx: 0.1,
  ny: 0.1,
  timestampMs: 1,
});

const scoreA = createStatsLoggedEvent({
  id: "s1",
  kind: "GOAL",
  nx: 0.2,
  ny: 0.2,
  timestampMs: 2,
});

const scoreB = createStatsLoggedEvent({
  id: "s2",
  kind: "POINT",
  nx: 0.3,
  ny: 0.3,
  timestampMs: 3,
  playerId: "p9",
});

describe("findLatestScorePendingScorer", () => {
  it("returns the most recent score with null playerId", () => {
    const s3 = createStatsLoggedEvent({
      id: "s3",
      kind: "POINT",
      nx: 0.4,
      ny: 0.4,
      timestampMs: 4,
    });
    const events = [field, scoreA, scoreB, s3];
    expect(findLatestScorePendingScorer(events)?.id).toBe("s3");
  });

  it("returns undefined when all scores tagged", () => {
    expect(findLatestScorePendingScorer([field, scoreB])).toBeUndefined();
  });
});

describe("assignScorerToEvents", () => {
  it("sets playerId only on the targeted score event", () => {
    const events = [field, scoreA, scoreB];
    const next = assignScorerToEvents(events, "s1", "player-7");
    expect(next[1]?.kind === "GOAL" && next[1].playerId).toBe("player-7");
    expect(next[2]?.kind === "POINT" && next[2].playerId).toBe("p9");
  });

  it("clears playerId when null passed", () => {
    const events = [
      field,
      createStatsLoggedEvent({
        id: "s3",
        kind: "TWO_POINT",
        nx: 0.5,
        ny: 0.5,
        timestampMs: 5,
        playerId: "x",
      }),
    ];
    const next = assignScorerToEvents(events, "s3", null);
    expect(next[1]?.kind === "TWO_POINT" && next[1].playerId).toBeNull();
  });
});
