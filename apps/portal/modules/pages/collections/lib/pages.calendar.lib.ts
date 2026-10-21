import type { PageCalendarDay, PageDateValue, PageFilter } from '@neuma/shared';
import {
  isPageDateValue,
  listPageCalendarDays,
  PAGE_PROPERTY_TYPE,
  readPageCalendarMonth,
  shiftPageCalendarMonth,
} from '@neuma/shared';
import {
  PAGE_CALENDAR_DATE_LENGTH,
  PAGE_CALENDAR_MILLISECONDS_IN_A_DAY,
  PAGE_CALENDAR_MONTH_LENGTH,
} from '../constants/pages.calendar.constants';
import type { PageCalendarCell, PageCalendarRange } from '../types/pages.calendar.types';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';

export const listDatePropertyKeys = (properties: readonly PageSchemaProperty[]): readonly string[] =>
  properties.filter((property) => property.type === PAGE_PROPERTY_TYPE.DATE).map((property) => property.key);

export const readRowDateValue = (row: PageRow, dateProperty: string): null | PageDateValue => {
  const value = row.propertyValues?.[dateProperty];
  return value !== undefined && isPageDateValue(value) ? value : null;
};

/** Drops the time and the end: the calendar places a row on the day it starts. */
export const readRowDate = (row: PageRow, dateProperty: string): null | string => {
  const value = readRowDateValue(row, dateProperty);
  return value === null ? null : value.start.slice(0, PAGE_CALENDAR_DATE_LENGTH);
};

/** Defaults to the month of the first dated row, then today, so the grid does not open empty. */
export const resolveCalendarMonth = (
  asked: null | string,
  rows: readonly PageRow[],
  dateProperty: null | string,
  today: string,
): string => {
  const pedido = asked === null ? null : readPageCalendarMonth(asked);
  if (pedido !== null) return pedido;
  const primera =
    dateProperty === null
      ? null
      : (rows.flatMap((row) => {
          const date = readRowDate(row, dateProperty);
          return date === null ? [] : [date];
        })[0] ?? null);
  return (primera ?? today).slice(0, PAGE_CALENDAR_MONTH_LENGTH);
};

export const readNeighbourMonth = (month: string, direction: 'EARLIER' | 'LATER'): string =>
  shiftPageCalendarMonth(month, direction === 'EARLIER' ? -1 : 1);

/** Rows without a date land in no cell; the caller lists them separately so they do not look deleted. */
export const buildCalendarCells = (
  month: string,
  rows: readonly PageRow[],
  dateOf: (row: PageRow) => null | string,
): readonly PageCalendarCell[] => {
  const byDate = new Map<string, PageRow[]>();
  for (const row of rows) {
    const date = dateOf(row);
    if (date === null) continue;
    const landed = byDate.get(date) ?? [];
    landed.push(row);
    byDate.set(date, landed);
  }
  return listPageCalendarDays(month).map((day: PageCalendarDay) => ({
    ...day,
    rows: byDate.get(day.date) ?? [],
  }));
};

const shiftDay = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00.000Z`) + days * PAGE_CALENDAR_MILLISECONDS_IN_A_DAY)
    .toISOString()
    .slice(0, PAGE_CALENDAR_DATE_LENGTH);

/** The first and the last day the grid of a month draws, leading and trailing days included. */
export const readCalendarGridRange = (month: string): PageCalendarRange => {
  const days = listPageCalendarDays(month);
  return { from: days[0]?.date ?? `${month}-01`, to: days.at(-1)?.date ?? `${month}-01` };
};

/**
 * Rows that start on a day of the range, made only of operators the server and the shared engine agree on: a start
 * after the day before the range, and a start not after the last day (it ends before the next day, or overlaps it).
 */
export const buildCalendarRangeFilter = (dateProperty: string, range: PageCalendarRange): PageFilter => ({
  conditions: [
    { kind: 'CONDITION', operator: 'IS_AFTER', propertyKey: dateProperty, value: shiftDay(range.from, -1) },
    {
      conditions: [
        { kind: 'CONDITION', operator: 'IS_BEFORE', propertyKey: dateProperty, value: shiftDay(range.to, 1) },
        { kind: 'CONDITION', operator: 'IS', propertyKey: dateProperty, value: range.to },
      ],
      kind: 'GROUP',
      operator: 'OR',
    },
  ],
  kind: 'GROUP',
  operator: 'AND',
});

export const buildCalendarUndatedFilter = (dateProperty: string): PageFilter => ({
  kind: 'CONDITION',
  operator: 'IS_EMPTY',
  propertyKey: dateProperty,
  value: null,
});

export const listRowsWithoutDate = (
  rows: readonly PageRow[],
  dateOf: (row: PageRow) => null | string,
): readonly PageRow[] => rows.filter((row) => dateOf(row) === null);
