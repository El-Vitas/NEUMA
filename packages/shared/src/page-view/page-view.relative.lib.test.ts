import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { PAGE_FILTER_ME, PAGE_RELATIVE_DATE } from './page-view.relative.constants.js';
import {
  findInvalidPageFilterToken,
  readPageRelativeDate,
  resolvePageFilter,
  resolvePageRelativeRange,
} from './page-view.relative.lib.js';
import type { PageFilter, PageViewProperty } from './page-view.types.js';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_FILTER_OPERATOR } from './page-view.types.js';

const properties: readonly PageViewProperty[] = [
  { key: 'title', type: PAGE_PROPERTY_TYPE.TITLE },
  { key: 'notes', type: PAGE_PROPERTY_TYPE.RICH_TEXT },
  { key: 'due', type: PAGE_PROPERTY_TYPE.DATE },
  { key: 'createdAt', type: PAGE_PROPERTY_TYPE.CREATED_TIME },
  { key: 'editedAt', type: PAGE_PROPERTY_TYPE.EDITED_TIME },
  { key: 'owners', type: PAGE_PROPERTY_TYPE.PERSON },
  { key: 'author', type: PAGE_PROPERTY_TYPE.CREATED_BY },
  { key: 'editor', type: PAGE_PROPERTY_TYPE.EDITED_BY },
];

const condition = (propertyKey: string, operator: string, value: unknown): PageFilter =>
  ({ kind: 'CONDITION', operator, propertyKey, value }) as PageFilter;

describe('reading a relative date', () => {
  test('reads every fixed word', () => {
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.TODAY)).toEqual({ kind: 'DAY', offset: 0 });
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.YESTERDAY)).toEqual({ kind: 'DAY', offset: -1 });
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.TOMORROW)).toEqual({ kind: 'DAY', offset: 1 });
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.THIS_WEEK)).toEqual({ kind: 'WEEK', offset: 0 });
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.LAST_WEEK)).toEqual({ kind: 'WEEK', offset: -1 });
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.NEXT_WEEK)).toEqual({ kind: 'WEEK', offset: 1 });
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.THIS_MONTH)).toEqual({ kind: 'MONTH', offset: 0 });
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.LAST_MONTH)).toEqual({ kind: 'MONTH', offset: -1 });
    expect(readPageRelativeDate(PAGE_RELATIVE_DATE.NEXT_MONTH)).toEqual({ kind: 'MONTH', offset: 1 });
  });

  test('reads a count of days, in the past or the future', () => {
    expect(readPageRelativeDate('@past_days:7')).toEqual({ count: 7, kind: 'PAST_DAYS' });
    expect(readPageRelativeDate('@next_days:30')).toEqual({ count: 30, kind: 'NEXT_DAYS' });
  });

  test('refuses what is not a relative date', () => {
    expect(readPageRelativeDate('2026-10-21')).toBeNull();
    expect(readPageRelativeDate('@someday')).toBeNull();
    expect(readPageRelativeDate('@past_days:0')).toBeNull();
    expect(readPageRelativeDate('@past_days:366')).toBeNull();
    expect(readPageRelativeDate('@past_days:3.5')).toBeNull();
    expect(readPageRelativeDate('@next_days:')).toBeNull();
    expect(readPageRelativeDate('today')).toBeNull();
  });
});

describe('the days a relative date covers', () => {
  const range = (text: string, today: string) => {
    const relative = readPageRelativeDate(text);
    if (relative === null) throw new Error(`Not a relative date: ${text}`);
    return resolvePageRelativeRange(relative, today);
  };

  test('covers one day for today, yesterday and tomorrow', () => {
    expect(range('@today', '2026-10-21')).toEqual({ end: '2026-10-21', start: '2026-10-21' });
    expect(range('@yesterday', '2026-10-21')).toEqual({ end: '2026-10-20', start: '2026-10-20' });
    expect(range('@tomorrow', '2026-10-31')).toEqual({ end: '2026-11-01', start: '2026-11-01' });
  });

  test('covers a week from Monday to Sunday', () => {
    expect(range('@this_week', '2026-10-21')).toEqual({ end: '2026-10-25', start: '2026-10-19' });
    expect(range('@this_week', '2026-10-25')).toEqual({ end: '2026-10-25', start: '2026-10-19' });
    expect(range('@this_week', '2026-10-19')).toEqual({ end: '2026-10-25', start: '2026-10-19' });
    expect(range('@last_week', '2026-10-21')).toEqual({ end: '2026-10-18', start: '2026-10-12' });
    expect(range('@next_week', '2026-10-21')).toEqual({ end: '2026-11-01', start: '2026-10-26' });
  });

  test('covers a whole month, across the turn of the year', () => {
    expect(range('@this_month', '2026-10-21')).toEqual({ end: '2026-10-31', start: '2026-10-01' });
    expect(range('@last_month', '2026-01-15')).toEqual({ end: '2025-12-31', start: '2025-12-01' });
    expect(range('@next_month', '2026-12-31')).toEqual({ end: '2027-01-31', start: '2027-01-01' });
    expect(range('@this_month', '2028-02-10')).toEqual({ end: '2028-02-29', start: '2028-02-01' });
  });

  test('counts today among the days of the past and the days ahead', () => {
    expect(range('@past_days:7', '2026-10-21')).toEqual({ end: '2026-10-21', start: '2026-10-15' });
    expect(range('@next_days:3', '2026-10-21')).toEqual({ end: '2026-10-23', start: '2026-10-21' });
  });
});

describe('resolving a filter for whoever looks at it', () => {
  const now = Date.parse('2026-10-26T02:30:00Z');

  test('turns a relative date into the days it covers in the zone of the viewer', () => {
    const filter = condition('due', PAGE_FILTER_OPERATOR.IS, PAGE_RELATIVE_DATE.THIS_WEEK);

    expect(resolvePageFilter(filter, properties, { now, timeZone: 'UTC', viewerId: 'u1' })).toEqual(
      condition('due', PAGE_FILTER_OPERATOR.IS, { end: '2026-11-01', start: '2026-10-26' }),
    );
    expect(resolvePageFilter(filter, properties, { now, timeZone: 'America/Santiago', viewerId: 'u1' })).toEqual(
      condition('due', PAGE_FILTER_OPERATOR.IS, { end: '2026-10-25', start: '2026-10-19' }),
    );
  });

  test('resolves the time columns of a block the same way', () => {
    const filter = condition('createdAt', PAGE_FILTER_OPERATOR.IS, PAGE_RELATIVE_DATE.TODAY);

    expect(resolvePageFilter(filter, properties, { now, timeZone: 'America/Santiago', viewerId: 'u1' })).toEqual(
      condition('createdAt', PAGE_FILTER_OPERATOR.IS, { end: '2026-10-25', start: '2026-10-25' }),
    );
    expect(
      resolvePageFilter(condition('editedAt', PAGE_FILTER_OPERATOR.IS_BEFORE, PAGE_RELATIVE_DATE.TODAY), properties, {
        now,
        timeZone: 'UTC',
        viewerId: 'u1',
      }),
    ).toEqual(condition('editedAt', PAGE_FILTER_OPERATOR.IS_BEFORE, { end: '2026-10-26', start: '2026-10-26' }));
  });

  test('puts the viewer where the filter says me, in people and in authors', () => {
    const context = { now, timeZone: 'UTC', viewerId: 'viewer-7' };

    expect(resolvePageFilter(condition('owners', 'CONTAINS', PAGE_FILTER_ME), properties, context)).toEqual(
      condition('owners', 'CONTAINS', 'viewer-7'),
    );
    expect(resolvePageFilter(condition('author', 'IS', PAGE_FILTER_ME), properties, context)).toEqual(
      condition('author', 'IS', 'viewer-7'),
    );
    expect(resolvePageFilter(condition('editor', 'IS_NOT', PAGE_FILTER_ME), properties, context)).toEqual(
      condition('editor', 'IS_NOT', 'viewer-7'),
    );
    expect(resolvePageFilter(condition('owners', 'CONTAINS', ['u1', PAGE_FILTER_ME]), properties, context)).toEqual(
      condition('owners', 'CONTAINS', ['u1', 'viewer-7']),
    );
  });

  test('gives two viewers of the same filter two different answers', () => {
    const filter = condition('owners', 'CONTAINS', PAGE_FILTER_ME);

    const forAda = resolvePageFilter(filter, properties, { now, timeZone: 'UTC', viewerId: 'ada' });
    const forBo = resolvePageFilter(filter, properties, { now, timeZone: 'UTC', viewerId: 'bo' });

    expect(forAda).toEqual(condition('owners', 'CONTAINS', 'ada'));
    expect(forBo).toEqual(condition('owners', 'CONTAINS', 'bo'));
  });

  test('leaves alone the words that only look like the markers', () => {
    const context = { now, timeZone: 'UTC', viewerId: 'viewer-7' };
    const text = condition('notes', 'CONTAINS', PAGE_FILTER_ME);
    const absolute = condition('due', 'IS', '2026-10-21');

    expect(resolvePageFilter(text, properties, context)).toEqual(text);
    expect(resolvePageFilter(absolute, properties, context)).toEqual(absolute);
    expect(resolvePageFilter(condition('due', 'IS', PAGE_FILTER_ME), properties, context)).toEqual(
      condition('due', 'IS', PAGE_FILTER_ME),
    );
  });

  test('resolves the conditions inside groups', () => {
    const filter: PageFilter = {
      conditions: [
        condition('owners', 'CONTAINS', PAGE_FILTER_ME),
        {
          conditions: [condition('due', 'IS_BEFORE', PAGE_RELATIVE_DATE.TODAY)],
          kind: 'GROUP',
          operator: PAGE_FILTER_GROUP_OPERATOR.OR,
        },
      ],
      kind: 'GROUP',
      operator: PAGE_FILTER_GROUP_OPERATOR.AND,
    };

    expect(resolvePageFilter(filter, properties, { now, timeZone: 'UTC', viewerId: 'ada' })).toEqual({
      conditions: [
        condition('owners', 'CONTAINS', 'ada'),
        {
          conditions: [condition('due', 'IS_BEFORE', { end: '2026-10-26', start: '2026-10-26' })],
          kind: 'GROUP',
          operator: PAGE_FILTER_GROUP_OPERATOR.OR,
        },
      ],
      kind: 'GROUP',
      operator: PAGE_FILTER_GROUP_OPERATOR.AND,
    });
  });
});

describe('checking the markers of a filter', () => {
  test('accepts the markers where they mean something', () => {
    const filter: PageFilter = {
      conditions: [condition('owners', 'CONTAINS', PAGE_FILTER_ME), condition('due', 'IS', '@next_days:5')],
      kind: 'GROUP',
      operator: PAGE_FILTER_GROUP_OPERATOR.AND,
    };

    expect(findInvalidPageFilterToken(filter, properties)).toBeNull();
  });

  test('names a date marker that is not one', () => {
    expect(findInvalidPageFilterToken(condition('due', 'IS', '@someday'), properties)).toContain('@someday');
    expect(findInvalidPageFilterToken(condition('createdAt', 'IS', '@past_days:0'), properties)).toContain(
      '@past_days:0',
    );
  });

  test('names a person marker that is not me', () => {
    expect(findInvalidPageFilterToken(condition('owners', 'CONTAINS', '@you'), properties)).toContain('@you');
  });

  test('leaves other properties alone', () => {
    expect(findInvalidPageFilterToken(condition('notes', 'CONTAINS', '@anything'), properties)).toBeNull();
  });
});
