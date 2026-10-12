import { MILLISECONDS_IN_A_DAY } from '../constants/time.constants.js';
import type { PageCalendarDay } from './page-view.types.js';

const MONTH_LENGTH = 7;
const DATE_LENGTH = 10;
/** Six whole weeks: the most a month can span, e.g. 31 days starting on a Sunday. */
const DAYS_DRAWN = 42;
/** Sunday is day 0 but the week starts on Monday, so step back six, not zero. */
const DAYS_BACK_FROM_SUNDAY = 6;

const writeDate = (date: Date): string => date.toISOString().slice(0, DATE_LENGTH);

/** A month is named `YYYY-MM` so names sort lexicographically without date comparison. */
export const readPageCalendarMonth = (value: string): null | string => {
  const month = value.slice(0, MONTH_LENGTH);
  const date = new Date(`${month}-01T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || writeDate(date).slice(0, MONTH_LENGTH) !== month ? null : month;
};

/** Moves an entry without dragging: one day sideways, a whole week up or down on the seven-column grid. */
export const shiftPageCalendarDate = (date: string, days: number): string =>
  writeDate(new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * MILLISECONDS_IN_A_DAY));

export const shiftPageCalendarMonth = (month: string, months: number): string => {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return writeDate(date).slice(0, MONTH_LENGTH);
};

/**
 * Always six Monday-first weeks, even when the month fits in five, so the grid
 * height does not change between months. Leading and trailing days are included
 * and flagged as outside the month.
 */
export const listPageCalendarDays = (month: string): readonly PageCalendarDay[] => {
  const first = new Date(`${month}-01T00:00:00.000Z`);
  const weekday = first.getUTCDay();
  const daysBack = weekday === 0 ? DAYS_BACK_FROM_SUNDAY : weekday - 1;
  const start = first.getTime() - daysBack * MILLISECONDS_IN_A_DAY;
  return Array.from({ length: DAYS_DRAWN }, (_unused, position) => {
    const date = writeDate(new Date(start + position * MILLISECONDS_IN_A_DAY));
    return { date, isOfTheMonth: date.slice(0, MONTH_LENGTH) === month };
  });
};
