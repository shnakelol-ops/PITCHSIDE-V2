import { describe, expect, it } from "vitest";

import { createStatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";
import { assignVoiceNoteToEvents } from "@src/features/stats/model/stats-voice-utils";

describe("assignVoiceNoteToEvents", () => {
  it("sets voiceNoteId on the matching event only", () => {
    const a = createStatsLoggedEvent({
      id: "a",
      selection: { domain: "field", fieldType: "wide" },
      nx: 0.1,
      ny: 0.1,
      timestampMs: 1,
    });
    const b = createStatsLoggedEvent({
      id: "b",
      selection: { domain: "score", scoreType: "goal" },
      nx: 0.2,
      ny: 0.2,
      timestampMs: 2,
    });
    const next = assignVoiceNoteToEvents([a, b], "b", "vn-1");
    expect(next[0]?.voiceNoteId).toBeNull();
    expect(next[1]?.voiceNoteId).toBe("vn-1");
  });

  it("can clear voiceNoteId with null", () => {
    const e = createStatsLoggedEvent({
      id: "x",
      selection: { domain: "field", fieldType: "shot" },
      nx: 0.5,
      ny: 0.5,
      timestampMs: 0,
      voiceNoteId: "old",
    });
    const next = assignVoiceNoteToEvents([e], "x", null);
    expect(next[0]?.voiceNoteId).toBeNull();
  });
});
