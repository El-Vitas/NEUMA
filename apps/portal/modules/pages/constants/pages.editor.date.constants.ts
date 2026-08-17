/**
 * The day as it reads, and the field laid over it that opens the browser's own
 * calendar.
 *
 * A day named in a sentence is a word in that sentence: it takes no height of
 * its own, only what the writing around it already takes. The 44px touch
 * target belongs to the picker it opens, not to the word that opens it.
 */
export const PAGE_EDITOR_DATE_STYLE_CLASS = [
  'relative inline-flex cursor-pointer items-baseline gap-1 rounded px-1 text-primary underline underline-offset-4',
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
].join(' ');

/** Laid over the day, invisible, so a click on what is read is a click on the calendar itself. */
export const PAGE_EDITOR_DATE_FIELD_STYLE_CLASS = 'absolute inset-0 h-full w-full cursor-pointer opacity-0';
