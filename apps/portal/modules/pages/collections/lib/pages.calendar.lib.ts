import type {
  PageCalendarDay,
  PageCalendarLane,
  PageDateScale,
  PageDateValue,
  PageDayRange,
  PageFilter,
} from '@neuma/shared';
import {
  isPageDateValue,
  layoutPageCalendarLanes,
  listPageCalendarDays,
  listPageCalendarWeekDays,
  PAGE_DATE_SCALE,
  PAGE_PROPERTY_TYPE,
  readPageCalendarMonth,
  shiftPageCalendarMonth,
} from '@neuma/shared';
import {
  PAGE_CALENDAR_DATE_LENGTH,
  PAGE_CALENDAR_DAYS_IN_A_WEEK,
  PAGE_CALENDAR_MILLISECONDS_IN_A_DAY,
  PAGE_CALENDAR_MONTH_LENGTH,
} from '../constants/pages.calendar.constants';
import type { PageCalendarCell, PageCalendarRange, PageCalendarSlot } from '../types/pages.calendar.types';
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

const chunkIntoWeeks = (days: readonly PageCalendarDay[]): readonly (readonly PageCalendarDay[])[] =>
  Array.from({ length: Math.ceil(days.length / PAGE_CALENDAR_DAYS_IN_A_WEEK) }, (_unused, week) =>
    days.slice(week * PAGE_CALENDAR_DAYS_IN_A_WEEK, (week + 1) * PAGE_CALENDAR_DAYS_IN_A_WEEK),
  );

const buildSlot = (
  placed: PageCalendarLane | undefined,
  period: PageDayRange | undefined,
  row: PageRow | undefined,
  column: number,
  date: string,
): null | PageCalendarSlot => {
  if (placed === undefined || period === undefined || row === undefined) return null;
  return {
    daysIntoEntry: Math.round(
      (Date.parse(`${date}T00:00:00.000Z`) - Date.parse(`${period.start}T00:00:00.000Z`)) /
        PAGE_CALENDAR_MILLISECONDS_IN_A_DAY,
    ),
    isFirstDay: period.start === date,
    isLastDay: period.end === date,
    row,
    showsTitle: column === placed.startColumn,
  };
};

const buildWeekCells = (
  week: readonly PageCalendarDay[],
  periods: ReadonlyMap<string, PageDayRange>,
  rowsById: ReadonlyMap<string, PageRow>,
): readonly PageCalendarCell[] => {
  const lanes = layoutPageCalendarLanes(
    week.map((day) => day.date),
    [...periods].map(([id, period]) => ({ end: period.end, id, start: period.start })),
  );
  const laneCount = lanes.reduce((most, placed) => Math.max(most, placed.lane + 1), 0);
  return week.map((day, column) => ({
    ...day,
    slots: Array.from({ length: laneCount }, (_unused, lane) => {
      const placed = lanes.find(
        (candidate) => candidate.lane === lane && candidate.startColumn <= column && column <= candidate.endColumn,
      );
      return buildSlot(
        placed,
        placed === undefined ? undefined : periods.get(placed.id),
        placed === undefined ? undefined : rowsById.get(placed.id),
        column,
        day.date,
      );
    }),
  }));
};

/**
 * Every day the grid draws with the entries that fall on it. An entry that lasts several days takes the same slot in
 * each, and the slots of a week are as many in every day of it so entries line up. Rows with no place in time land in
 * no cell; the caller lists them separately so they do not look deleted.
 */
export const buildCalendarCells = (
  days: readonly PageCalendarDay[],
  rows: readonly PageRow[],
  periodOf: (row: PageRow) => null | PageDayRange,
): readonly PageCalendarCell[] => {
  const periods = new Map<string, PageDayRange>();
  for (const row of rows) {
    const period = periodOf(row);
    if (period !== null) periods.set(row.id, period);
  }
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return chunkIntoWeeks(days).flatMap((week) => buildWeekCells(week, periods, rowsById));
};

/** The days a calendar draws: the seven of a week around a day, or the six weeks of a month. */
export const listCalendarGridDays = (scale: PageDateScale, month: string, day: string): readonly PageCalendarDay[] =>
  scale === PAGE_DATE_SCALE.WEEK
    ? listPageCalendarWeekDays(day).map((date) => ({ date, isOfTheMonth: true }))
    : listPageCalendarDays(month);

/** The first and the last day the grid of a month draws, leading and trailing days included. */
export const readCalendarGridRange = (month: string): PageCalendarRange => {
  const days = listPageCalendarDays(month);
  return { from: days[0]?.date ?? `${month}-01`, to: days.at(-1)?.date ?? `${month}-01` };
};

/** The seven days of the week that holds a day, Monday first. */
export const readCalendarWeekRange = (day: string): PageCalendarRange => {
  const days = listPageCalendarWeekDays(day);
  return { from: days[0] ?? day, to: days.at(-1) ?? day };
};

/**
 * Rows whose dates overlap the days of the range, so a range that began before the grid and reaches into it is drawn
 * too. It is one condition, which any filter can be added to without going past the depth the server accepts.
 */
export const buildCalendarRangeFilter = (dateProperty: string, range: PageCalendarRange): PageFilter => ({
  kind: 'CONDITION',
  operator: 'IS',
  propertyKey: dateProperty,
  value: { end: range.to, start: range.from },
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
