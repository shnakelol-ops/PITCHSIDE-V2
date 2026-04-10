/**
 * Title-case each word for display only (does not mutate stored values).
 * e.g. "glen" → "Glen", "st johns" → "St Johns"
 */
export function formatOpponentForDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return "Opponent";
  if (t === "Opponent") return t;
  return t
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
