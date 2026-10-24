import type { PageDateScale } from '@neuma/shared';

/** How wide a day is drawn: a column when the scale is days, a sliver when it is months. */
export const PAGE_TIMELINE_PIXELS_PER_DAY: Readonly<Record<PageDateScale, number>> = {
  DAY: 40,
  MONTH: 5,
  WEEK: 16,
};

/** Pixels: the name of each row, which stays in view while the days scroll sideways. */
export const PAGE_TIMELINE_LABEL_WIDTH = 224;

/** Pixels: also what the virtualizer assumes for a row before it has been drawn. */
export const PAGE_TIMELINE_ROW_HEIGHT = 36;

/** Pixels: the grip at each end of a bar that stretches it. */
export const PAGE_TIMELINE_HANDLE_WIDTH = 8;

/** A drag shorter than this many pixels is a click on the title, not a move. */
export const PAGE_TIMELINE_DRAG_THRESHOLD = 4;

/** What each mark along the top says, by scale: the day of the month, the first day of the week, or the month. */
export const PAGE_TIMELINE_TICK_LABEL_FORMATS: Readonly<Record<PageDateScale, Intl.DateTimeFormatOptions>> = {
  DAY: { day: 'numeric', timeZone: 'UTC' },
  MONTH: { month: 'short', timeZone: 'UTC', year: '2-digit' },
  WEEK: { day: 'numeric', month: 'short', timeZone: 'UTC' },
};

export const PAGE_TIMELINE_KEYBOARD_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
};
