import { MILLISECONDS_IN_A_DAY } from '../constants/time.constants.js';
import { isValidPageDateValue } from '../page-property/page-property.date.lib.js';
import type { PageDateValue } from '../page-property/page-property.types.js';
import type { PageZonedParts } from '../page-view/page-view.zone.lib.js';
import { readPageLocalDay, readPageWeekday, readPageZonedParts } from '../page-view/page-view.zone.lib.js';
import { PAGE_FORMULA_DATE_UNIT_VALUES } from './page-formula.constants.js';
import { failWithInvalidArgument, succeedWith, succeedWithNumber } from './page-formula.outcome.lib.js';
import type { PageFormulaOutcome, PageFormulaRunner, PageFormulaValue } from './page-formula.types.js';
import { readFormulaDate, readFormulaNumber, readFormulaText } from './page-formula.values.lib.js';

type DateUnit = (typeof PAGE_FORMULA_DATE_UNIT_VALUES)[number];

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MILLISECONDS_IN_AN_HOUR = 3_600_000;

const MILLISECONDS_IN_A_MINUTE = 60_000;

const MONTHS_IN_A_YEAR = 12;

const DAYS_IN_A_WEEK = 7;

const FORMAT_TOKEN_PATTERN = /YYYY|MM|DD|HH|mm|ss/g;

const OUT_OF_RANGE_MESSAGE = 'The date is outside the dates that can be shown';

const isDayText = (text: string): boolean => DAY_PATTERN.test(text);

const readUnit = (value: PageFormulaValue | undefined): DateUnit | null => {
  const text = readFormulaText(value);
  return PAGE_FORMULA_DATE_UNIT_VALUES.find((unit) => unit === text) ?? null;
};

const describeUnits = (): string => PAGE_FORMULA_DATE_UNIT_VALUES.join(', ');

const addMonths = (time: number, months: number): number => {
  const moment = new Date(time);
  const dayOfMonth = moment.getUTCDate();
  moment.setUTCDate(1);
  moment.setUTCMonth(moment.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(moment.getUTCFullYear(), moment.getUTCMonth() + 1, 0)).getUTCDate();
  moment.setUTCDate(Math.min(dayOfMonth, lastDay));
  return moment.getTime();
};

const MILLISECONDS_BY_FIXED_UNIT: Readonly<Record<'days' | 'hours' | 'minutes' | 'weeks', number>> = {
  days: MILLISECONDS_IN_A_DAY,
  hours: MILLISECONDS_IN_AN_HOUR,
  minutes: MILLISECONDS_IN_A_MINUTE,
  weeks: MILLISECONDS_IN_A_DAY * DAYS_IN_A_WEEK,
};

const shiftTime = (time: number, amount: number, unit: DateUnit): number => {
  if (unit === 'months') return addMonths(time, amount);
  if (unit === 'years') return addMonths(time, amount * MONTHS_IN_A_YEAR);
  return time + amount * MILLISECONDS_BY_FIXED_UNIT[unit];
};

const shiftMoment = (moment: string, amount: number, unit: DateUnit): string | null => {
  const shifted = new Date(shiftTime(Date.parse(moment), amount, unit));
  if (Number.isNaN(shifted.getTime())) return null;
  return isDayText(moment) ? shifted.toISOString().slice(0, 10) : shifted.toISOString();
};

const isTimeUnit = (unit: DateUnit): boolean => unit === 'hours' || unit === 'minutes';

const isWholeMonthUnit = (unit: DateUnit): boolean => unit === 'months' || unit === 'years';

const shiftDate = (date: PageDateValue, amount: number, unit: DateUnit, direction: 1 | -1): PageFormulaOutcome => {
  if (isTimeUnit(unit) && isDayText(date.start)) {
    return failWithInvalidArgument(`A date without a time cannot move by ${unit}`);
  }
  if (isWholeMonthUnit(unit) && !Number.isInteger(amount)) {
    return failWithInvalidArgument(`${unit} must be moved by a whole number`);
  }
  const start = shiftMoment(date.start, amount * direction, unit);
  const end = date.end === undefined ? undefined : shiftMoment(date.end, amount * direction, unit);
  if (start === null || end === null) return failWithInvalidArgument(OUT_OF_RANGE_MESSAGE);
  return succeedWith(end === undefined ? { start } : { end, start });
};

const runShift =
  (direction: 1 | -1): PageFormulaRunner =>
  (functionArguments) => {
    const date = readFormulaDate(functionArguments[0]);
    const amount = readFormulaNumber(functionArguments[1]);
    if (date === null || amount === null) return succeedWith(null);
    const unit = readUnit(functionArguments[2]);
    if (unit === null) return failWithInvalidArgument(`The unit must be one of ${describeUnits()}`);
    return shiftDate(date, amount, unit, direction);
  };

const countWholeMonths = (later: number, earlier: number): number => {
  const laterMoment = new Date(later);
  const earlierMoment = new Date(earlier);
  const months =
    (laterMoment.getUTCFullYear() - earlierMoment.getUTCFullYear()) * MONTHS_IN_A_YEAR +
    laterMoment.getUTCMonth() -
    earlierMoment.getUTCMonth();
  return addMonths(earlier, months) > later ? months - 1 : months;
};

const measureBetween = (later: number, earlier: number, unit: DateUnit): number => {
  if (unit === 'months') return countWholeMonths(later, earlier);
  if (unit === 'years') return Math.trunc(countWholeMonths(later, earlier) / MONTHS_IN_A_YEAR);
  return Math.trunc((later - earlier) / MILLISECONDS_BY_FIXED_UNIT[unit]);
};

const runBetween: PageFormulaRunner = (functionArguments) => {
  const left = readFormulaDate(functionArguments[0]);
  const right = readFormulaDate(functionArguments[1]);
  if (left === null || right === null) return succeedWith(null);
  const unit = readUnit(functionArguments[2]);
  if (unit === null) return failWithInvalidArgument(`The unit must be one of ${describeUnits()}`);
  const leftTime = Date.parse(left.start);
  const rightTime = Date.parse(right.start);
  if (leftTime >= rightTime) return succeedWith(measureBetween(leftTime, rightTime, unit));
  return succeedWith(-measureBetween(rightTime, leftTime, unit));
};

const readParts = (date: PageDateValue, timeZone: string): PageZonedParts => {
  if (isDayText(date.start)) {
    const [year = 1970, month = 1, day = 1] = date.start.split('-').map(Number);
    return { day, hour: 0, minute: 0, month, second: 0, year };
  }
  return readPageZonedParts(Date.parse(date.start), timeZone);
};

const runPart =
  (read: (parts: PageZonedParts) => number): PageFormulaRunner =>
  (functionArguments, environment) => {
    const date = readFormulaDate(functionArguments[0]);
    return date === null ? succeedWith(null) : succeedWith(read(readParts(date, environment.context.timeZone)));
  };

const readIsoWeekday = (parts: PageZonedParts): number => {
  const day = [parts.year, parts.month, parts.day].map((part, index) =>
    String(part).padStart(index === 0 ? 4 : 2, '0'),
  );
  const sundayFirst = readPageWeekday(day.join('-'));
  return ((sundayFirst + 6) % DAYS_IN_A_WEEK) + 1;
};

const padNumber = (value: number, length: number): string => String(value).padStart(length, '0');

const runFormatDate: PageFormulaRunner = (functionArguments, environment) => {
  const date = readFormulaDate(functionArguments[0]);
  const pattern = readFormulaText(functionArguments[1]);
  if (date === null || pattern === null) return succeedWith(null);
  const parts = readParts(date, environment.context.timeZone);
  const tokens: Readonly<Record<string, string>> = {
    DD: padNumber(parts.day, 2),
    HH: padNumber(parts.hour, 2),
    MM: padNumber(parts.month, 2),
    YYYY: padNumber(parts.year, 4),
    mm: padNumber(parts.minute, 2),
    ss: padNumber(parts.second, 2),
  };
  return succeedWith(pattern.replaceAll(FORMAT_TOKEN_PATTERN, (token) => tokens[token] ?? token));
};

const runDate: PageFormulaRunner = (functionArguments) => {
  const text = readFormulaText(functionArguments[0]);
  if (text === null) return succeedWith(null);
  const trimmed = text.trim();
  return isValidPageDateValue({ start: trimmed })
    ? succeedWith({ start: trimmed })
    : failWithInvalidArgument(`"${text}" is not a date. Use 2026-10-21 or 2026-10-21T09:30:00Z`);
};

const runFromTimestamp: PageFormulaRunner = (functionArguments) => {
  const milliseconds = readFormulaNumber(functionArguments[0]);
  if (milliseconds === null) return succeedWith(null);
  const moment = new Date(milliseconds);
  return Number.isNaN(moment.getTime())
    ? failWithInvalidArgument('The timestamp is outside the dates that can be shown')
    : succeedWith({ start: moment.toISOString() });
};

const runTimestamp: PageFormulaRunner = (functionArguments) => {
  const date = readFormulaDate(functionArguments[0]);
  return date === null ? succeedWith(null) : succeedWithNumber(Date.parse(date.start));
};

const runStart: PageFormulaRunner = (functionArguments) => {
  const date = readFormulaDate(functionArguments[0]);
  return date === null ? succeedWith(null) : succeedWith({ start: date.start });
};

const runEnd: PageFormulaRunner = (functionArguments) => {
  const date = readFormulaDate(functionArguments[0]);
  return date === null ? succeedWith(null) : succeedWith({ start: date.end ?? date.start });
};

export const PAGE_FORMULA_DATE_RUNNERS: Readonly<Record<string, PageFormulaRunner>> = {
  date: runDate,
  dateAdd: runShift(1),
  dateBetween: runBetween,
  dateSubtract: runShift(-1),
  day: runPart((parts) => parts.day),
  end: runEnd,
  formatDate: runFormatDate,
  fromTimestamp: runFromTimestamp,
  hour: runPart((parts) => parts.hour),
  minute: runPart((parts) => parts.minute),
  month: runPart((parts) => parts.month),
  now: (_functionArguments, environment) =>
    succeedWith({ start: new Date(environment.context.nowMilliseconds).toISOString() }),
  start: runStart,
  timestamp: runTimestamp,
  today: (_functionArguments, environment) =>
    succeedWith({ start: readPageLocalDay(environment.context.nowMilliseconds, environment.context.timeZone) }),
  weekday: runPart(readIsoWeekday),
  year: runPart((parts) => parts.year),
};
