import { describe, expect, it } from "vitest";

import { createStatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import {
  assignScorerToEvents,
  findLatestScorePendingScorer,
} from "@src/features/stats/model/stats-scorer-utils";

const field = createStatsLoggedEvent({
  id: "f1",
  selection: { domain: "field", fieldType: "wide" },
  nx: 0.1,
  ny: 0.1,
  timestampMs: 1,
});

const scoreA = createStatsLoggedEvent({
  id: "s1",
  selection: { domain: "score", scoreType: "goal" },
  nx: 0.2,
  ny: 0.2,
  timestampMs: 2,
});

const scoreB = createStatsLoggedEvent({
  id: "s2",
  selection: { domain: "score", scoreType: "point" },
  nx: 0.3,
  ny: 0.3,
  timestampMs: 3,
  scorerId: "p9",
});

describe("findLatestScorePendingScorer", () => {
  it("returns undefined when no score needs a scorer", () => {
    expect(findLatestScorePendingScorer([field, scoreB])).toBeUndefined();
  });

  it("returns the most recent score with null scorerId", () => {
    const s3 = createStatsLoggedEvent({
      id: "s3",
      selection: { domain: "score", scoreType: "point" },
      nx: 0.4,
      ny: 0.4,
      timestampMs: 4,
    });
    const list = [scoreA, scoreB, s3];
    const p = findLatestScorePendingScorer(list);
    expect(p?.id).toBe("s3");
  });

  it("prefers later pending over earlier", () => {
    const list = [scoreA, scoreB];
    const patched = assignScorerToEvents(list, "s1", "p1");
    const withSecondPending = [
      ...patched,
      createStatsLoggedEvent({
        id: "s4",
        selection: { domain: "score", scoreType: "two_point" },
        nx: 0.5,
        ny: 0.5,
        timestampMs: 5,
      }),
    ];
    expect(findLatestScorePendingScorer(withSecondPending)?.id).toBe("s4");
  });
});

describe("assignScorerToEvents", () => {
  it("updates only the matching score event", () => {
    const next = assignScorerToEvents([field, scoreA, scoreB], "s1", "player-7");
    expect(next[1]?.domain === "score" && next[1].scorerId).toBe("player-7");
    expect(next[2]?.domain === "score" && next[2].scorerId).toBe("p9");
    expect(next[0]).toBe(field);
  });

  it("does not mutate field events for same id (no match)", () => {
    const next = assignScorerToEvents([field], "f1", "x");
    expect(next[0]).toEqual(field);
  });

  it("can clear scorer with null", () => {
    const next = assignScorerToEvents([scoreB], "s2", null);
    expect(next[0]?.domain === "score" && next[0].scorerId).toBeNull();
  });
});
