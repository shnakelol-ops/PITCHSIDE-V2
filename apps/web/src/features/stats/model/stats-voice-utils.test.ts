import { describe, expect, it } from "vitest";

import { createStatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import { assignVoiceNoteToEvents } from "@src/features/stats/model/stats-voice-utils";

describe("assignVoiceNoteToEvents", () => {
  it("sets voiceNoteId on the matching event only", () => {
    const a = createStatsLoggedEvent({
      id: "a",
      kind: "WIDE",
      nx: 0.1,
      ny: 0.1,
      timestampMs: 1,
    });
    const b = createStatsLoggedEvent({
      id: "b",
      kind: "GOAL",
      nx: 0.2,
      ny: 0.2,
      timestampMs: 2,
    });
    const next = assignVoiceNoteToEvents([a, b], "a", "vn-1");
    expect(next[0]?.voiceNoteId).toBe("vn-1");
    expect(next[1]?.voiceNoteId).toBeNull();
  });

  it("can clear voice note", () => {
    const e = createStatsLoggedEvent({
      id: "x",
      kind: "SHOT",
      nx: 0,
      ny: 0,
      timestampMs: 0,
      voiceNoteId: "old",
    });
    const next = assignVoiceNoteToEvents([e], "x", null);
    expect(next[0]?.voiceNoteId).toBeNull();
  });
});
