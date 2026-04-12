/** Minimal roster row for scorer chips (match feed can replace later). */
export type StatsRosterPlayer = {
  id: string;
  name: string;
};

/** Dev / fallback roster — not wired to DB in Phase 4. */
export const STATS_DEV_PLACEHOLDER_ROSTER: StatsRosterPlayer[] = [
  { id: "p1", name: "A. Keane" },
  { id: "p2", name: "B. Murphy" },
  { id: "p3", name: "C. Walsh" },
  { id: "p4", name: "D. Ryan" },
  { id: "p5", name: "E. O'Brien" },
];
