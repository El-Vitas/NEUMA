export const PAGE_CALENDAR_DATE_LENGTH = 10;
export const PAGE_CALENDAR_MONTH_LENGTH = 7;

export const PAGE_CALENDAR_MILLISECONDS_IN_A_DAY = 86_400_000;

export const PAGE_CALENDAR_KEYBOARD_STEPS: Readonly<Record<string, number>> = {
  ArrowDown: 7,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
};

/** Any full week starting on Monday: `Intl` needs a date to name the weekdays in the viewer's language. */
export const PAGE_CALENDAR_WEEKDAY_STARTS = [
  '2026-01-05',
  '2026-01-06',
  '2026-01-07',
  '2026-01-08',
  '2026-01-09',
  '2026-01-10',
  '2026-01-11',
] as const;
