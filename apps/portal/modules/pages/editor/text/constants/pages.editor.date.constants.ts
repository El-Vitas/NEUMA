/** Inline text: no min height, since the 44px touch target belongs to the picker it opens. */
export const PAGE_EDITOR_DATE_STYLE_CLASS = [
  'relative inline-flex cursor-pointer items-baseline gap-1 rounded px-1 text-primary underline underline-offset-4',
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
].join(' ');

/** UTC, because a calendar day has no hour to shift. */
export const PAGE_EDITOR_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
};

export const PAGE_EDITOR_DATE_FIELD_STYLE_CLASS = 'absolute inset-0 h-full w-full cursor-pointer opacity-0';
