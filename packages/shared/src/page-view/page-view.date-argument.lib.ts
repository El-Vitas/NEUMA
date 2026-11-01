import type { PageDateValue, PagePropertyValue } from '../page-property/page-property.types.js';
import { readPageDateValue } from '../page-property/page-property.date.lib.js';
import { PAGE_FILTER_OPERATOR } from './page-view.types.js';
import type { PageFilterOperator } from './page-view.types.js';
import { addPageDays, readPageLocalDay, readPageZonedDayStart } from './page-view.zone.lib.js';

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What a date condition compares with, seen from a zone: the days it covers and the first and last instants of them.
 * A date without a time is compared by days and one with a time by instants, so a block created late in the evening
 * belongs to the day of the person looking, and a due date stays on its calendar day wherever they are.
 */
export interface PageDateArgument {
  readonly endDay: string;
  readonly endTime: number;
  readonly startDay: string;
  readonly startTime: number;
}

interface Endpoint {
  readonly firstDay: string;
  readonly firstTime: number;
  readonly lastDay: string;
  readonly lastTime: number;
}

const readEndpoint = (text: string, timeZone: string): Endpoint | null => {
  const instant = Date.parse(text);
  if (Number.isNaN(instant)) return null;
  if (!DAY_ONLY.test(text)) {
    const day = readPageLocalDay(instant, timeZone);
    return { firstDay: day, firstTime: instant, lastDay: day, lastTime: instant };
  }
  return {
    firstDay: text,
    firstTime: readPageZonedDayStart(text, timeZone),
    lastDay: text,
    lastTime: readPageZonedDayStart(addPageDays(text, 1), timeZone) - 1,
  };
};

const readRange = (range: PageDateValue, timeZone: string): PageDateArgument | null => {
  const first = readEndpoint(range.start, timeZone);
  const last = readEndpoint(range.end ?? range.start, timeZone);
  if (first === null || last === null) return null;
  return { endDay: last.lastDay, endTime: last.lastTime, startDay: first.firstDay, startTime: first.firstTime };
};

export const readPageDateArgument = (argument: PagePropertyValue, timeZone: string): PageDateArgument | null => {
  if (typeof argument === 'string') return readRange({ start: argument }, timeZone);
  const range = readPageDateValue(argument);
  return range === null ? null : readRange(range, timeZone);
};

interface Bounds<TPoint extends number | string> {
  readonly argumentEnd: TPoint;
  readonly argumentStart: TPoint;
  readonly valueEnd: TPoint;
  readonly valueStart: TPoint;
}

type RangeComparison = <TPoint extends number | string>(bounds: Bounds<TPoint>) => boolean;

/** A range is a match for a day when the two overlap; "before" looks at where it ends and "after" where it starts. */
const COMPARISONS: Readonly<Partial<Record<PageFilterOperator, RangeComparison>>> = {
  [PAGE_FILTER_OPERATOR.IS]: (bounds) =>
    bounds.valueStart <= bounds.argumentEnd && bounds.argumentStart <= bounds.valueEnd,
  [PAGE_FILTER_OPERATOR.IS_BEFORE]: (bounds) => bounds.valueEnd < bounds.argumentStart,
  [PAGE_FILTER_OPERATOR.IS_AFTER]: (bounds) => bounds.valueStart > bounds.argumentEnd,
  [PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE]: (bounds) => bounds.valueEnd <= bounds.argumentEnd,
  [PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER]: (bounds) => bounds.valueStart >= bounds.argumentStart,
};

export const isPageDateOperator = (operator: PageFilterOperator): boolean => COMPARISONS[operator] !== undefined;

/** Whether a date satisfies a date operator against what the filter compares with, in the zone of the viewer. */
export const matchesPageDateOperator = (
  operator: PageFilterOperator,
  value: PageDateValue,
  argument: PageDateArgument,
): boolean => {
  const compare = COMPARISONS[operator];
  if (compare === undefined) return false;
  const valueEnd = value.end ?? value.start;
  if (DAY_ONLY.test(value.start)) {
    return compare({
      argumentEnd: argument.endDay,
      argumentStart: argument.startDay,
      valueEnd,
      valueStart: value.start,
    });
  }
  return compare({
    argumentEnd: argument.endTime,
    argumentStart: argument.startTime,
    valueEnd: Date.parse(valueEnd),
    valueStart: Date.parse(value.start),
  });
};
