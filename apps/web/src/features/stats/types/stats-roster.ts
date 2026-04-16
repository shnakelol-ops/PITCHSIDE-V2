/** Minimal roster row for scorer chips (match feed can replace later). */
export type StatsRosterPlayer = {
  id: string;
  name: string;
  number: string;
};

/** Dev / fallback roster — not wired to DB in Phase 4. */
export const STATS_DEV_PLACEHOLDER_ROSTER: StatsRosterPlayer[] = [
  { id: "p1", name: "A. Keane", number: "01" },
  { id: "p2", name: "B. Murphy", number: "02" },
  { id: "p3", name: "C. Walsh", number: "03" },
  { id: "p4", name: "D. Ryan", number: "04" },
  { id: "p5", name: "E. O'Brien", number: "05" },
  { id: "p6", name: "F. Daly", number: "06" },
  { id: "p7", name: "G. Nolan", number: "07" },
  { id: "p8", name: "H. Byrne", number: "08" },
  { id: "p9", name: "I. Quinn", number: "09" },
  { id: "p10", name: "J. Reilly", number: "10" },
  { id: "p11", name: "K. McCabe", number: "11" },
  { id: "p12", name: "L. O'Connell", number: "12" },
  { id: "p13", name: "M. Finn", number: "13" },
  { id: "p14", name: "N. Sheridan", number: "14" },
  { id: "p15", name: "O. Ward", number: "15" },
];
