import type { PageDateValue } from './page-property.types.js';

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

const isRealDay = (text: string): boolean => {
  const match = DAY_PATTERN.exec(text);
  if (match === null) return false;
  const [, year, month, day] = match;
  const date = new Date(`${text}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  );
};

const isRealInstant = (text: string): boolean => INSTANT_PATTERN.test(text) && !Number.isNaN(Date.parse(text));

const isDay = (text: string): boolean => DAY_PATTERN.test(text);

const isRealMoment = (text: string): boolean => isRealDay(text) || isRealInstant(text);

const isRecord = (candidate: unknown): candidate is Readonly<Record<string, unknown>> =>
  typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);

export const getPageDateStartTime = (value: PageDateValue): number => Date.parse(value.start);

export const getPageDateEndTime = (value: PageDateValue): number => Date.parse(value.end ?? value.start);

export const isValidPageDateValue = (value: PageDateValue): boolean => {
  if (!isRealMoment(value.start)) return false;
  if (value.end === undefined) return true;
  if (!isRealMoment(value.end) || isDay(value.start) !== isDay(value.end)) return false;
  return getPageDateEndTime(value) >= getPageDateStartTime(value);
};

export const readPageDateValue = (stored: unknown): PageDateValue | null => {
  if (!isRecord(stored) || typeof stored.start !== 'string') return null;
  if (stored.end === undefined) return { start: stored.start };
  return typeof stored.end === 'string' ? { end: stored.end, start: stored.start } : null;
};

export const isPageDateValue = (candidate: unknown): candidate is PageDateValue =>
  readPageDateValue(candidate) !== null;

export const pageDateContainsTime = (value: PageDateValue, time: number): boolean =>
  getPageDateStartTime(value) <= time && time <= getPageDateEndTime(value);

export const formatPageDate = (value: PageDateValue): string =>
  value.end === undefined ? value.start : `${value.start} → ${value.end}`;
