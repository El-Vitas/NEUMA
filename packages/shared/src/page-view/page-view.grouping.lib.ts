import { MILLISECONDS_IN_A_DAY } from '../constants/time.constants.js';
import type { PageDateBucket } from './page-view.types.js';
import { PAGE_DATE_BUCKET } from './page-view.types.js';

const DATE_LENGTH = 10;
const MONTH_LENGTH = 7;
/** Sunday is day 0 but the week starts on Monday, so step back six, not zero. */
const DAYS_BACK_FROM_SUNDAY = 6;

const readDate = (value: string): Date | null => {
  const date = new Date(`${value.slice(0, DATE_LENGTH)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const writeDate = (date: Date): string => date.toISOString().slice(0, DATE_LENGTH);

const readMondayOf = (date: Date): Date => {
  const weekday = date.getUTCDay();
  const daysBack = weekday === 0 ? DAYS_BACK_FROM_SUNDAY : weekday - 1;
  return new Date(date.getTime() - daysBack * MILLISECONDS_IN_A_DAY);
};

/**
 * The group is named by its start (the day, that week's Monday, the month) so
 * names sort chronologically as plain strings. A non-date returns null and the
 * caller sends it to the no-value group.
 */
export const readPageDateBucketKey = (value: string, bucket: PageDateBucket): null | string => {
  const date = readDate(value);
  if (date === null) return null;
  switch (bucket) {
    case PAGE_DATE_BUCKET.WEEK:
      return writeDate(readMondayOf(date));
    case PAGE_DATE_BUCKET.MONTH:
      return writeDate(date).slice(0, MONTH_LENGTH);
    default:
      return writeDate(date);
  }
};
