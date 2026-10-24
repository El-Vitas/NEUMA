import { MILLISECONDS_IN_A_DAY } from '../constants/time.constants.js';

const MILLISECONDS_IN_A_SECOND = 1000;

const MAXIMUM_DAY_SEARCH_STEPS = 40;

export const isValidPageTimeZone = (timeZone: string): boolean => {
  if (timeZone === '') return false;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone !== '';
  } catch {
    return false;
  }
};

const readZoneParts = (instant: number, timeZone: string): Record<string, number> => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
    minute: 'numeric',
    month: 'numeric',
    second: 'numeric',
    timeZone,
    year: 'numeric',
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts;
};

export interface PageZonedParts {
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly month: number;
  readonly second: number;
  readonly year: number;
}

/** The wall clock of an instant for someone in the zone. */
export const readPageZonedParts = (instant: number, timeZone: string): PageZonedParts => {
  const { day = 1, hour = 0, minute = 0, month = 1, second = 0, year = 1970 } = readZoneParts(instant, timeZone);
  return { day, hour, minute, month, second, year };
};

const toDayText = (year: number, month: number, day: number): string =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** The calendar day an instant falls on for someone in the zone, as `YYYY-MM-DD`. */
export const readPageLocalDay = (instant: number, timeZone: string): string => {
  const { day = 1, month = 1, year = 1970 } = readZoneParts(instant, timeZone);
  return toDayText(year, month, day);
};

const readZoneOffset = (instant: number, timeZone: string): number => {
  const { day = 1, hour = 0, minute = 0, month = 1, second = 0, year = 1970 } = readZoneParts(instant, timeZone);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, second);
  return wallClock - Math.floor(instant / MILLISECONDS_IN_A_SECOND) * MILLISECONDS_IN_A_SECOND;
};

const readFirstInstantOfDay = (day: string, timeZone: string): number => {
  let low = Date.parse(`${day}T00:00:00Z`) - MILLISECONDS_IN_A_DAY;
  let high = low + 3 * MILLISECONDS_IN_A_DAY;
  for (let step = 0; step < MAXIMUM_DAY_SEARCH_STEPS && high - low > 1; step += 1) {
    const middle = Math.floor((low + high) / 2);
    if (readPageLocalDay(middle, timeZone) < day) low = middle;
    else high = middle;
  }
  return high;
};

/**
 * The first instant of a calendar day in a zone. A day whose midnight does not exist (the clocks jump over it) starts
 * at the first instant that day does have.
 */
export const readPageZonedDayStart = (day: string, timeZone: string): number => {
  const utcMidnight = Date.parse(`${day}T00:00:00Z`);
  const guess = utcMidnight - readZoneOffset(utcMidnight, timeZone);
  const candidate = utcMidnight - readZoneOffset(guess, timeZone);
  const isFirstInstant =
    readPageLocalDay(candidate, timeZone) === day && readPageLocalDay(candidate - 1, timeZone) !== day;
  return isFirstInstant ? candidate : readFirstInstantOfDay(day, timeZone);
};

export const addPageDays = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * MILLISECONDS_IN_A_DAY).toISOString().slice(0, 10);

/** 0 is Sunday and 1 is Monday, as `Date#getUTCDay` counts. */
export const readPageWeekday = (day: string): number => new Date(`${day}T00:00:00Z`).getUTCDay();
