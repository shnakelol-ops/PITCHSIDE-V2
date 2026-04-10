const DEFAULT_LOCALE = "en-IE";

export type FormatMatchDateOptions = {
  locale?: string;
  timeZone?: string;
};

export function formatMatchDate(
  date: Date,
  options?: FormatMatchDateOptions,
): string {
  return new Intl.DateTimeFormat(options?.locale ?? DEFAULT_LOCALE, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(options?.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}
