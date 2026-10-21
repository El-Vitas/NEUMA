/** The length of `YYYY-MM-DD`: whatever follows it in a moment is a time of day. */
export const PAGE_DATE_DAY_LENGTH = 10;

export const PAGE_DATE_ONLY_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
};

export const PAGE_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  year: 'numeric',
};
