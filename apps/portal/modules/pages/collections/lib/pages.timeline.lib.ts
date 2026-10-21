import type { PageDayRange, PageFilter, PageTimelineChangeMode } from '@neuma/shared';
import {
  isValidPageDateValue,
  layoutPageTimelineBar,
  readPageTimelinePeriod,
  shiftPageCalendarDate,
} from '@neuma/shared';
import type { PageRow } from '../types/pages.schema.types';
import type { PageTimelineEntry } from '../types/pages.timeline.types';
import { readRowDateValue } from './pages.calendar.lib';

/** The days a row lasts, read from its start property and, when the view names one, its end property. */
export const readRowPeriod = (row: PageRow, startProperty: string, endProperty: null | string): null | PageDayRange =>
  readPageTimelinePeriod(
    readRowDateValue(row, startProperty),
    endProperty === null ? null : readRowDateValue(row, endProperty),
  );

/**
 * What to read so the window holds every row that lasts into it, as filters whose answers are joined. With one
 * property the rows overlapping the window are one question. With the end in another property it takes two, because
 * "starts before the window ends and ends after it starts" does not cover a row that has a start and no end, and an
 * "or" of the two would nest too deep to add the filter of the person to it.
 */
export const buildTimelineWindowFilters = (
  startProperty: string,
  endProperty: null | string,
  window: PageDayRange,
): readonly PageFilter[] => {
  const overlapping: PageFilter = {
    kind: 'CONDITION',
    operator: 'IS',
    propertyKey: startProperty,
    value: { end: window.end, start: window.start },
  };
  if (endProperty === null) return [overlapping];
  return [
    {
      conditions: [
        { kind: 'CONDITION', operator: 'IS_ON_OR_BEFORE', propertyKey: startProperty, value: window.end },
        { kind: 'CONDITION', operator: 'IS_ON_OR_AFTER', propertyKey: endProperty, value: window.start },
      ],
      kind: 'GROUP',
      operator: 'AND',
    },
    {
      conditions: [overlapping, { kind: 'CONDITION', operator: 'IS_EMPTY', propertyKey: endProperty, value: null }],
      kind: 'GROUP',
      operator: 'AND',
    },
  ];
};

const compareEntries = (left: PageTimelineEntry, right: PageTimelineEntry): number => {
  if (left.period.start !== right.period.start) return left.period.start < right.period.start ? -1 : 1;
  if (left.period.end !== right.period.end) return left.period.end < right.period.end ? -1 : 1;
  return left.row.id < right.row.id ? -1 : 1;
};

/** The rows that have a bar in the window, in the order of the days they start, then end, then by id. */
export const buildTimelineEntries = (
  rows: readonly PageRow[],
  periodOf: (row: PageRow) => null | PageDayRange,
  window: PageDayRange,
  pixelsPerDay: number,
): readonly PageTimelineEntry[] => {
  const entries: PageTimelineEntry[] = [];
  for (const row of rows) {
    const period = periodOf(row);
    if (period === null) continue;
    const bar = layoutPageTimelineBar(period, window, pixelsPerDay);
    if (bar !== null) entries.push({ bar, period, row });
  }
  return entries.toSorted(compareEntries);
};

/** The days a bar covers while it is dragged: moved whole, or stretched from one end without crossing the other. */
export const previewTimelinePeriod = (
  period: PageDayRange,
  mode: PageTimelineChangeMode,
  deltaDays: number,
): PageDayRange => {
  if (mode === 'MOVE') {
    return {
      end: shiftPageCalendarDate(period.end, deltaDays),
      start: shiftPageCalendarDate(period.start, deltaDays),
    };
  }
  if (mode === 'RESIZE_END') {
    const end = shiftPageCalendarDate(period.end, deltaDays);
    return { end: end < period.start ? period.start : end, start: period.start };
  }
  const start = shiftPageCalendarDate(period.start, deltaDays);
  return { end: period.end, start: start > period.end ? period.end : start };
};

/** The whole days a pointer has gone since it was pressed; half a day or less is not yet a day. */
export const readTimelineDragDays = (startX: number, currentX: number, pixelsPerDay: number): number => {
  const days = Math.round((currentX - startX) / pixelsPerDay);
  return days === 0 ? 0 : days;
};

/** A mistyped address opens the timeline on today instead of failing. */
export const resolveTimelineDay = (requested: null | string, today: string): string =>
  requested !== null && isValidPageDateValue({ start: requested }) && requested.length === today.length
    ? requested
    : today;
