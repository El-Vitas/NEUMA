import { describe, expect, it } from 'bun:test';
import { matchesPageFilter } from '@neuma/shared';
import {
  buildCalendarRangeFilter,
  buildCalendarUndatedFilter,
  readCalendarGridRange,
  readCalendarWeekRange,
} from '@/modules/pages/collections/lib/pages.calendar.lib';

const properties = [{ key: 'due', options: null, type: 'DATE' as const }];

const matches = (start: string, end?: string): boolean => {
  const range = readCalendarGridRange('2026-03');
  const filter = buildCalendarRangeFilter('due', range);
  return matchesPageFilter(filter, { due: end === undefined ? { start } : { end, start } }, properties);
};

describe('el rango que pide un calendario', () => {
  it('covers the whole grid of the month, with its leading and trailing days', () => {
    expect(readCalendarGridRange('2026-03')).toEqual({ from: '2026-02-23', to: '2026-04-05' });
  });

  it('covers the seven days of the week that holds the day asked for', () => {
    expect(readCalendarWeekRange('2026-09-16')).toEqual({ from: '2026-09-14', to: '2026-09-20' });
    expect(readCalendarWeekRange('2026-09-20')).toEqual({ from: '2026-09-14', to: '2026-09-20' });
  });

  it('keeps every row that falls on a day the grid draws, first and last day included', () => {
    expect(matches('2026-02-23')).toBe(true);
    expect(matches('2026-03-15')).toBe(true);
    expect(matches('2026-04-05')).toBe(true);
    expect(matches('2026-04-05T23:30:00.000Z')).toBe(true);
  });

  it('drops the rows that lie wholly before the grid or after it', () => {
    expect(matches('2026-02-22')).toBe(false);
    expect(matches('2026-04-06')).toBe(false);
    expect(matches('2026-01-10', '2026-02-22')).toBe(false);
  });

  it('keeps a range that starts inside the grid even when it ends beyond it', () => {
    expect(matches('2026-04-04', '2026-04-20')).toBe(true);
    expect(matches('2026-04-05', '2026-05-30')).toBe(true);
  });

  it('keeps a range that started before the grid and reaches into it, or covers all of it', () => {
    expect(matches('2026-02-10', '2026-02-23')).toBe(true);
    expect(matches('2026-01-01', '2026-12-31')).toBe(true);
  });

  it('is one condition, so it can be added to any filter without going past the depth the server accepts', () => {
    const filter = buildCalendarRangeFilter('due', readCalendarGridRange('2026-03'));

    expect(filter).toEqual({
      kind: 'CONDITION',
      operator: 'IS',
      propertyKey: 'due',
      value: { end: '2026-04-05', start: '2026-02-23' },
    });
  });
});

describe('las filas sin fecha de un calendario', () => {
  it('are asked for as the rows whose date is empty', () => {
    expect(buildCalendarUndatedFilter('due')).toEqual({
      kind: 'CONDITION',
      operator: 'IS_EMPTY',
      propertyKey: 'due',
      value: null,
    });
  });
});
