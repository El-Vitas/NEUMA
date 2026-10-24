import { MILLISECONDS_IN_A_DAY } from '../constants/time.constants.js';
import type { PageDateValue } from '../page-property/page-property.types.js';
import { listPageCalendarWeekDays, shiftPageCalendarDate } from './page-view.calendar.lib.js';
import type { PageDayRange } from './page-view.relative.types.js';
import type { PageDateScale } from './page-view.types.js';

const DAY_LENGTH = 10;
const MONTH_LENGTH = 7;
const DAYS_IN_A_WEEK = 7;
const MONTHS_IN_A_WINDOW = 12;
const DAY_WINDOW_DAYS = 42;
const WEEK_WINDOW_WEEKS = 26;
const WEEKS_BEFORE_THE_ANCHOR = 4;
const DAY_WINDOW_WEEKS_BEFORE_THE_ANCHOR = 1;
const DAY_PAGE_DAYS = 28;
const WEEK_PAGE_WEEKS = 13;
const MONTH_PAGE_MONTHS = 6;

export type PageTimelineChangeMode = 'MOVE' | 'RESIZE_END' | 'RESIZE_START';

/** A mark along the top: the day it starts on, how far it is from the window start, and how many days it lasts. */
export interface PageTimelineTick {
  readonly day: string;
  readonly offsetDays: number;
  readonly spanDays: number;
}

export interface PageTimelineBar {
  readonly endsAfterWindow: boolean;
  readonly left: number;
  readonly startsBeforeWindow: boolean;
  readonly width: number;
}

export interface PageTimelineChangeInput {
  readonly deltaDays: number;
  /** The property that holds where a row ends, when it is not the one that holds where it starts. */
  readonly endProperty: string | null;
  readonly endValue: PageDateValue | null;
  readonly mode: PageTimelineChangeMode;
  readonly startProperty: string;
  readonly startValue: PageDateValue;
}

const dayOf = (moment: string): string => moment.slice(0, DAY_LENGTH);

const hasTime = (moment: string): boolean => moment.length > DAY_LENGTH;

const countDaysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / MILLISECONDS_IN_A_DAY);

const readLastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** Months have different lengths, so a day that the target month lacks lands on that month's last day. */
const shiftDayByMonths = (day: string, months: number): string => {
  const [year = 1970, month = 1, dayOfMonth = 1] = day.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = readLastDayOfMonth(target.getUTCFullYear(), target.getUTCMonth());
  target.setUTCDate(Math.min(dayOfMonth, lastDay));
  return target.toISOString().slice(0, DAY_LENGTH);
};

const readFirstDayOfMonth = (day: string): string => `${day.slice(0, MONTH_LENGTH)}-01`;

const readWeekStart = (day: string): string => listPageCalendarWeekDays(day)[0] ?? day;

/**
 * The days a timeline draws around an anchor day. Every window starts on a Monday (day and week scales) or on the
 * first of a month, so the marks along the top fit it exactly.
 */
export const readPageTimelineWindow = (scale: PageDateScale, anchor: string): PageDayRange => {
  if (scale === 'MONTH') {
    const start = shiftDayByMonths(readFirstDayOfMonth(anchor), -1);
    return { end: shiftPageCalendarDate(shiftDayByMonths(start, MONTHS_IN_A_WINDOW), -1), start };
  }
  const weeksBefore = scale === 'DAY' ? DAY_WINDOW_WEEKS_BEFORE_THE_ANCHOR : WEEKS_BEFORE_THE_ANCHOR;
  const length = scale === 'DAY' ? DAY_WINDOW_DAYS : WEEK_WINDOW_WEEKS * DAYS_IN_A_WEEK;
  const start = shiftPageCalendarDate(readWeekStart(anchor), -weeksBefore * DAYS_IN_A_WEEK);
  return { end: shiftPageCalendarDate(start, length - 1), start };
};

/** A page forward or back is a little less than a window, so the last days seen are still on screen. */
export const shiftPageTimelineAnchor = (scale: PageDateScale, anchor: string, direction: -1 | 1): string => {
  switch (scale) {
    case 'DAY':
      return shiftPageCalendarDate(anchor, direction * DAY_PAGE_DAYS);
    case 'WEEK':
      return shiftPageCalendarDate(anchor, direction * WEEK_PAGE_WEEKS * DAYS_IN_A_WEEK);
    case 'MONTH':
      return shiftDayByMonths(anchor, direction * MONTH_PAGE_MONTHS);
  }
};

const listFixedTicks = (window: PageDayRange, spanDays: number): readonly PageTimelineTick[] => {
  const total = countDaysBetween(window.start, window.end) + 1;
  return Array.from({ length: Math.ceil(total / spanDays) }, (_unused, position) => ({
    day: shiftPageCalendarDate(window.start, position * spanDays),
    offsetDays: position * spanDays,
    spanDays,
  }));
};

const listMonthTicks = (window: PageDayRange): readonly PageTimelineTick[] => {
  const ticks: PageTimelineTick[] = [];
  let day = window.start;
  while (day <= window.end) {
    const next = shiftDayByMonths(readFirstDayOfMonth(day), 1);
    ticks.push({ day, offsetDays: countDaysBetween(window.start, day), spanDays: countDaysBetween(day, next) });
    day = next;
  }
  return ticks;
};

export const listPageTimelineTicks = (scale: PageDateScale, window: PageDayRange): readonly PageTimelineTick[] => {
  switch (scale) {
    case 'DAY':
      return listFixedTicks(window, 1);
    case 'WEEK':
      return listFixedTicks(window, DAYS_IN_A_WEEK);
    case 'MONTH':
      return listMonthTicks(window);
  }
};

/**
 * The days a row lasts. Without an end property the row ends where its own range ends; an end that falls before the
 * start is read as the start day. A row with no start has no place in time.
 */
export const readPageTimelinePeriod = (
  startValue: PageDateValue | null,
  endValue: PageDateValue | null,
): PageDayRange | null => {
  if (startValue === null) return null;
  const start = dayOf(startValue.start);
  const endMoment = endValue === null ? (startValue.end ?? startValue.start) : (endValue.end ?? endValue.start);
  const end = dayOf(endMoment);
  return { end: end < start ? start : end, start };
};

export const layoutPageTimelineBar = (
  period: PageDayRange,
  window: PageDayRange,
  pixelsPerDay: number,
): PageTimelineBar | null => {
  if (period.end < window.start || period.start > window.end) return null;
  const startsBeforeWindow = period.start < window.start;
  const endsAfterWindow = period.end > window.end;
  const first = startsBeforeWindow ? window.start : period.start;
  const last = endsAfterWindow ? window.end : period.end;
  return {
    endsAfterWindow,
    left: countDaysBetween(window.start, first) * pixelsPerDay,
    startsBeforeWindow,
    width: (countDaysBetween(first, last) + 1) * pixelsPerDay,
  };
};

/** Where a day is along the window, or null when the window does not hold it. */
export const readPageTimelineOffset = (day: string, window: PageDayRange, pixelsPerDay: number): number | null =>
  day < window.start || day > window.end ? null : countDaysBetween(window.start, day) * pixelsPerDay;

const shiftMoment = (moment: string, days: number): string =>
  `${shiftPageCalendarDate(dayOf(moment), days)}${moment.slice(DAY_LENGTH)}`;

/** A range that ends the day it starts, with no time, is the day alone. */
const writeValue = (start: string, end: string | undefined): PageDateValue => {
  if (end === undefined) return { start };
  const isSameDay = dayOf(end) === dayOf(start) && !hasTime(end);
  return isSameDay ? { start } : { end, start };
};

const shiftValue = (value: PageDateValue, days: number): PageDateValue =>
  writeValue(shiftMoment(value.start, days), value.end === undefined ? undefined : shiftMoment(value.end, days));

const resizeStartOfRange = (value: PageDateValue, days: number): PageDateValue => {
  const end = value.end ?? value.start;
  const moved = shiftMoment(value.start, days);
  return writeValue(dayOf(moved) > dayOf(end) ? end : moved, end);
};

const resizeEndOfRange = (value: PageDateValue, days: number): PageDateValue => {
  const moved = shiftMoment(value.end ?? value.start, days);
  return writeValue(value.start, dayOf(moved) < dayOf(value.start) ? value.start : moved);
};

const changeSingleRange = (input: PageTimelineChangeInput): Record<string, PageDateValue> => {
  const { deltaDays, mode, startProperty, startValue } = input;
  switch (mode) {
    case 'MOVE':
      return { [startProperty]: shiftValue(startValue, deltaDays) };
    case 'RESIZE_START':
      return { [startProperty]: resizeStartOfRange(startValue, deltaDays) };
    case 'RESIZE_END':
      return { [startProperty]: resizeEndOfRange(startValue, deltaDays) };
  }
};

const resizeEndProperty = (input: PageTimelineChangeInput, endProperty: string): Record<string, PageDateValue> => {
  const { deltaDays, endValue, startValue } = input;
  const base = endValue ?? { start: startValue.end ?? startValue.start };
  const moved = shiftValue(base, deltaDays);
  const endDay = dayOf(moved.end ?? moved.start);
  return { [endProperty]: endDay < dayOf(startValue.start) ? { start: startValue.start } : moved };
};

const resizeStartProperty = (input: PageTimelineChangeInput): Record<string, PageDateValue> => {
  const { deltaDays, endValue, startProperty, startValue } = input;
  const moved = shiftMoment(startValue.start, deltaDays);
  const endDay = endValue === null ? null : dayOf(endValue.end ?? endValue.start);
  const start = endDay !== null && dayOf(moved) > endDay ? `${endDay}${startValue.start.slice(DAY_LENGTH)}` : moved;
  return { [startProperty]: { ...startValue, start } };
};

const changeSeparateEnd = (input: PageTimelineChangeInput, endProperty: string): Record<string, PageDateValue> => {
  const { deltaDays, endValue, mode, startProperty, startValue } = input;
  switch (mode) {
    case 'MOVE':
      return {
        [startProperty]: shiftValue(startValue, deltaDays),
        ...(endValue === null ? {} : { [endProperty]: shiftValue(endValue, deltaDays) }),
      };
    case 'RESIZE_START':
      return resizeStartProperty(input);
    case 'RESIZE_END':
      return resizeEndProperty(input, endProperty);
  }
};

/**
 * What to write to the row when its bar is dragged: the properties that change, each with its whole new value.
 * Only these travel, so a drag never overwrites another edit of the row.
 */
export const buildPageTimelineChange = (input: PageTimelineChangeInput): Record<string, PageDateValue> =>
  input.endProperty === null ? changeSingleRange(input) : changeSeparateEnd(input, input.endProperty);
