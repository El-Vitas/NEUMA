import type { PageDateValue } from '@neuma/shared';
import {
  PAGE_DATE_DAY_LENGTH as DAY_LENGTH,
  PAGE_DATE_ONLY_FORMAT,
  PAGE_DATE_TIME_FORMAT,
} from '../constants/pages.dates.constants';

const hasTime = (moment: string): boolean => moment.length > DAY_LENGTH;

/** A day has no time zone, so it is drawn as written; an instant is drawn where the reader is. */
const formatMoment = (moment: string, locale: string): string => {
  const date = new Date(hasTime(moment) ? moment : `${moment}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return moment;
  const format = hasTime(moment) ? PAGE_DATE_TIME_FORMAT : PAGE_DATE_ONLY_FORMAT;
  return new Intl.DateTimeFormat(locale, format).format(date);
};

export const formatDateValueForDisplay = (value: PageDateValue, locale: string): string => {
  const start = formatMoment(value.start, locale);
  return value.end === undefined ? start : `${start} → ${formatMoment(value.end, locale)}`;
};

/** `YYYY-MM-DD` of an input, or the instant's day for a field that only picks days. */
export const toDayInputValue = (moment: string | undefined): string =>
  moment === undefined ? '' : moment.slice(0, DAY_LENGTH);

/**
 * Puts the start of a date on another day and moves the end by the same distance, so a range keeps its length and
 * a time of day keeps its hour.
 */
export const moveDateValueTo = (current: PageDateValue | null, day: string): PageDateValue => {
  if (current === null) return { start: day };
  const offset = Date.parse(`${day}T00:00:00Z`) - Date.parse(`${current.start.slice(0, DAY_LENGTH)}T00:00:00Z`);
  const shift = (moment: string): string => {
    const moved = new Date(Date.parse(`${moment.slice(0, DAY_LENGTH)}T00:00:00Z`) + offset);
    return `${moved.toISOString().slice(0, DAY_LENGTH)}${moment.slice(DAY_LENGTH)}`;
  };
  return current.end === undefined
    ? { start: shift(current.start) }
    : { end: shift(current.end), start: shift(current.start) };
};

export const buildDateValue = (start: string, end: string): PageDateValue | null => {
  if (start === '') return null;
  return end === '' ? { start } : { end, start };
};
