import { describe, expect, it } from 'bun:test';
import { matchesPageFilter } from '@neuma/shared';
import {
  buildCalendarRangeFilter,
  buildCalendarUndatedFilter,
  readCalendarGridRange,
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

  it('keeps every row that starts on a day the grid draws, first and last day included', () => {
    expect(matches('2026-02-23')).toBe(true);
    expect(matches('2026-03-15')).toBe(true);
    expect(matches('2026-04-05')).toBe(true);
    expect(matches('2026-04-05T23:30:00.000Z')).toBe(true);
  });

  it('drops the rows that start before the grid or after it', () => {
    expect(matches('2026-02-22')).toBe(false);
    expect(matches('2026-04-06')).toBe(false);
  });

  it('keeps a range that starts inside the grid even when it ends beyond it', () => {
    expect(matches('2026-04-04', '2026-04-20')).toBe(true);
    expect(matches('2026-04-05', '2026-05-30')).toBe(true);
  });

  it('is a filter no deeper than the server accepts', () => {
    const filter = buildCalendarRangeFilter('due', readCalendarGridRange('2026-03'));

    expect(filter).toEqual({
      conditions: [
        { kind: 'CONDITION', operator: 'IS_AFTER', propertyKey: 'due', value: '2026-02-22' },
        {
          conditions: [
            { kind: 'CONDITION', operator: 'IS_BEFORE', propertyKey: 'due', value: '2026-04-06' },
            { kind: 'CONDITION', operator: 'IS', propertyKey: 'due', value: '2026-04-05' },
          ],
          kind: 'GROUP',
          operator: 'OR',
        },
      ],
      kind: 'GROUP',
      operator: 'AND',
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
