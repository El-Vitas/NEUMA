import type { PageCalendarDay } from '@neuma/shared';
import { listPageCalendarDays, PAGE_PROPERTY_TYPE, readPageCalendarMonth, shiftPageCalendarMonth } from '@neuma/shared';
import { PAGE_CALENDAR_DATE_LENGTH, PAGE_CALENDAR_MONTH_LENGTH } from '../constants/pages.calendar.constants';
import type { PageCalendarCell } from '../types/pages.calendar.types';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';

export const listDatePropertyKeys = (properties: readonly PageSchemaProperty[]): readonly string[] =>
  properties.filter((property) => property.type === PAGE_PROPERTY_TYPE.DATE).map((property) => property.key);

/** Drops the time: the calendar places rows by day only. */
export const readRowDate = (row: PageRow, dateProperty: string): null | string => {
  const value = row.propertyValues?.[dateProperty];
  if (typeof value !== 'string' || value === '') return null;
  return value.slice(0, PAGE_CALENDAR_DATE_LENGTH);
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

export const listRowsWithoutDate = (
  rows: readonly PageRow[],
  dateOf: (row: PageRow) => null | string,
): readonly PageRow[] => rows.filter((row) => dateOf(row) === null);
