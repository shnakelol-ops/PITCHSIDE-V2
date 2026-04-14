import type { StatsLoggedEvent } from "@src/features/stats/model/stats-logged-event";

export function assignVoiceNoteToEvents(
  events: readonly StatsLoggedEvent[],
  eventId: string,
  voiceNoteId: string | null,
): StatsLoggedEvent[] {
  return events.map((e) =>
    e.id === eventId ? { ...e, voiceNoteId } : e,
  );
}
