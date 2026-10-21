import { describe, expect, test } from 'bun:test';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { readPageDateArgument } from './page-view.date-argument.lib.js';
import { getPageFilterOperators, matchesPageFilter } from './page-view.filter.lib.js';
import { PAGE_RELATIVE_DATE } from './page-view.relative.constants.js';
import { resolvePageFilter } from './page-view.relative.lib.js';
import type { PageFilter, PageFilterOperator, PageViewProperty } from './page-view.types.js';
import { PAGE_FILTER_OPERATOR } from './page-view.types.js';

const properties: readonly PageViewProperty[] = [
  { key: 'due', type: PAGE_PROPERTY_TYPE.DATE },
  { key: 'createdAt', type: PAGE_PROPERTY_TYPE.CREATED_TIME },
];

const condition = (propertyKey: string, operator: PageFilterOperator, value: PagePropertyValue | null): PageFilter => ({
  kind: 'CONDITION',
  operator,
  propertyKey,
  value,
});

const UTC = { timeZone: 'UTC' };
const SANTIAGO = { timeZone: 'America/Santiago' };

describe('reading the date a filter compares with', () => {
  test('reads a day as the whole day in the zone', () => {
    expect(readPageDateArgument('2026-10-20', 'America/Santiago')).toEqual({
      endDay: '2026-10-20',
      endTime: Date.parse('2026-10-21T02:59:59.999Z'),
      startDay: '2026-10-20',
      startTime: Date.parse('2026-10-20T03:00:00.000Z'),
    });
  });

  test('reads an instant as itself, on the day it falls on in the zone', () => {
    expect(readPageDateArgument('2026-10-21T02:30:00Z', 'America/Santiago')).toEqual({
      endDay: '2026-10-20',
      endTime: Date.parse('2026-10-21T02:30:00Z'),
      startDay: '2026-10-20',
      startTime: Date.parse('2026-10-21T02:30:00Z'),
    });
  });

  test('reads a range of days from its first instant to its last', () => {
    expect(readPageDateArgument({ end: '2026-10-25', start: '2026-10-19' }, 'UTC')).toEqual({
      endDay: '2026-10-25',
      endTime: Date.parse('2026-10-25T23:59:59.999Z'),
      startDay: '2026-10-19',
      startTime: Date.parse('2026-10-19T00:00:00.000Z'),
    });
  });

  test('reads nothing from what is not a date', () => {
    expect(readPageDateArgument('soon', 'UTC')).toBeNull();
    expect(readPageDateArgument(12, 'UTC')).toBeNull();
  });
});

describe('filtering by a day in the zone of the viewer', () => {
  const lateOnTheTwentieth = { createdAt: { start: '2026-10-21T02:30:00Z' } };

  test('puts an instant on the day it fell on for whoever looks, not on the day in UTC', () => {
    const onTheTwentieth = condition('createdAt', PAGE_FILTER_OPERATOR.IS, '2026-10-20');
    const onTheTwentyFirst = condition('createdAt', PAGE_FILTER_OPERATOR.IS, '2026-10-21');

    expect(matchesPageFilter(onTheTwentieth, lateOnTheTwentieth, properties, SANTIAGO)).toBe(true);
    expect(matchesPageFilter(onTheTwentyFirst, lateOnTheTwentieth, properties, SANTIAGO)).toBe(false);
    expect(matchesPageFilter(onTheTwentieth, lateOnTheTwentieth, properties, UTC)).toBe(false);
    expect(matchesPageFilter(onTheTwentyFirst, lateOnTheTwentieth, properties, UTC)).toBe(true);
  });

  test('keeps a date without a time on its calendar day, whatever the zone', () => {
    const row = { due: { start: '2026-10-20' } };
    const onTheTwentieth = condition('due', PAGE_FILTER_OPERATOR.IS, '2026-10-20');

    expect(matchesPageFilter(onTheTwentieth, row, properties, UTC)).toBe(true);
    expect(matchesPageFilter(onTheTwentieth, row, properties, SANTIAGO)).toBe(true);
    expect(matchesPageFilter(onTheTwentieth, row, properties, { timeZone: 'Pacific/Kiritimati' })).toBe(true);
  });

  test('uses UTC when no zone is given', () => {
    const row = lateOnTheTwentieth;

    expect(matchesPageFilter(condition('createdAt', PAGE_FILTER_OPERATOR.IS, '2026-10-21'), row, properties)).toBe(
      true,
    );
  });
});

describe('filtering by a range of days', () => {
  const thisWeek = { end: '2026-10-25', start: '2026-10-19' };

  test('matches a date inside the range, with both ends included', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS, thisWeek);

    expect(matchesPageFilter(filter, { due: { start: '2026-10-19' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-25' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-18' } }, properties)).toBe(false);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-26' } }, properties)).toBe(false);
  });

  test('matches a range of dates that overlaps the range of the filter', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS, thisWeek);

    expect(matchesPageFilter(filter, { due: { end: '2026-10-20', start: '2026-10-10' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { end: '2026-10-30', start: '2026-10-24' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { end: '2026-10-30', start: '2026-10-10' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { end: '2026-10-18', start: '2026-10-10' } }, properties)).toBe(false);
  });

  test('is before a range only when it ends before the range starts', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS_BEFORE, thisWeek);

    expect(matchesPageFilter(filter, { due: { start: '2026-10-18' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-19' } }, properties)).toBe(false);
    expect(matchesPageFilter(filter, { due: { end: '2026-10-19', start: '2026-10-10' } }, properties)).toBe(false);
  });

  test('is after a range only when it starts after the range ends', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS_AFTER, thisWeek);

    expect(matchesPageFilter(filter, { due: { start: '2026-10-26' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-25' } }, properties)).toBe(false);
  });
});

describe('filtering on or before and on or after', () => {
  const day = '2026-10-20';

  test('on or before takes the end of the date and keeps the day itself', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE, day);

    expect(matchesPageFilter(filter, { due: { start: '2026-10-19' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-20' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-21' } }, properties)).toBe(false);
    expect(matchesPageFilter(filter, { due: { end: '2026-10-21', start: '2026-10-19' } }, properties)).toBe(false);
  });

  test('on or after takes the start of the date and keeps the day itself', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER, day);

    expect(matchesPageFilter(filter, { due: { start: '2026-10-21' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-20' } }, properties)).toBe(true);
    expect(matchesPageFilter(filter, { due: { start: '2026-10-19' } }, properties)).toBe(false);
    expect(matchesPageFilter(filter, { due: { end: '2026-10-21', start: '2026-10-19' } }, properties)).toBe(false);
  });

  test('is offered for dates and backed by a predicate', () => {
    const operators = getPageFilterOperators(PAGE_PROPERTY_LOGICAL_TYPE.DATE);

    expect(operators).toContain(PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE);
    expect(operators).toContain(PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER);
    expect(getPageFilterOperators(PAGE_PROPERTY_LOGICAL_TYPE.NUMBER)).not.toContain(
      PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE,
    );
  });
});

describe('filtering by a relative date, as the viewer sees the calendar', () => {
  const now = Date.parse('2026-10-26T02:30:00Z');
  const resolve = (filter: PageFilter, timeZone: string): PageFilter =>
    resolvePageFilter(filter, properties, { now, timeZone, viewerId: 'ada' });

  test('is this week for a viewer whose week has not turned yet', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS, PAGE_RELATIVE_DATE.THIS_WEEK);
    const sunday = { due: { start: '2026-10-25' } };
    const monday = { due: { start: '2026-10-26' } };

    expect(matchesPageFilter(resolve(filter, 'America/Santiago'), sunday, properties, SANTIAGO)).toBe(true);
    expect(matchesPageFilter(resolve(filter, 'America/Santiago'), monday, properties, SANTIAGO)).toBe(false);
    expect(matchesPageFilter(resolve(filter, 'UTC'), sunday, properties, UTC)).toBe(false);
    expect(matchesPageFilter(resolve(filter, 'UTC'), monday, properties, UTC)).toBe(true);
  });

  test('is overdue when a date is before today', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS_BEFORE, PAGE_RELATIVE_DATE.TODAY);
    const yesterdayInSantiago = { due: { start: '2026-10-24' } };
    const todayInSantiago = { due: { start: '2026-10-25' } };

    expect(matchesPageFilter(resolve(filter, 'America/Santiago'), yesterdayInSantiago, properties, SANTIAGO)).toBe(
      true,
    );
    expect(matchesPageFilter(resolve(filter, 'America/Santiago'), todayInSantiago, properties, SANTIAGO)).toBe(false);
  });

  test('keeps a block created late in the evening on the day of the viewer', () => {
    const filter = condition('createdAt', PAGE_FILTER_OPERATOR.IS, PAGE_RELATIVE_DATE.TODAY);
    const row = { createdAt: { start: '2026-10-26T01:00:00Z' } };

    expect(matchesPageFilter(resolve(filter, 'America/Santiago'), row, properties, SANTIAGO)).toBe(true);
    expect(matchesPageFilter(resolve(filter, 'UTC'), row, properties, UTC)).toBe(true);
    expect(matchesPageFilter(resolve(filter, 'America/Santiago'), row, properties, UTC)).toBe(false);
  });

  test('looks at the next days from today on, today included', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS, '@next_days:3');

    expect(matchesPageFilter(resolve(filter, 'UTC'), { due: { start: '2026-10-26' } }, properties, UTC)).toBe(true);
    expect(matchesPageFilter(resolve(filter, 'UTC'), { due: { start: '2026-10-28' } }, properties, UTC)).toBe(true);
    expect(matchesPageFilter(resolve(filter, 'UTC'), { due: { start: '2026-10-29' } }, properties, UTC)).toBe(false);
    expect(matchesPageFilter(resolve(filter, 'UTC'), { due: { start: '2026-10-25' } }, properties, UTC)).toBe(false);
  });
});
