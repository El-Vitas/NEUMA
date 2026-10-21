import { describe, expect, test } from 'bun:test';
import {
  EMPTY_PAGE_VIEW_CONFIGURATION,
  pageViewConfigurationSchema,
  readPageViewConfiguration,
} from './page-view.schemas.js';
import type { PageFilterCondition } from './page-view.types.js';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_FILTER_OPERATOR, PAGE_SORT_DIRECTION } from './page-view.types.js';

const doingCondition: PageFilterCondition = {
  kind: 'CONDITION',
  operator: PAGE_FILTER_OPERATOR.IS,
  propertyKey: 'status',
  value: 'doing',
};

describe('reading a stored view configuration', () => {
  test('reads grouping, filter and sorts', () => {
    const stored = {
      filter: doingCondition,
      groupBy: 'status',
      sorts: [{ direction: PAGE_SORT_DIRECTION.ASCENDING, propertyKey: 'title' }],
    };

    expect(readPageViewConfiguration(stored)).toEqual({
      ...EMPTY_PAGE_VIEW_CONFIGURATION,
      filter: doingCondition,
      groupBy: 'status',
      sorts: [{ direction: PAGE_SORT_DIRECTION.ASCENDING, propertyKey: 'title' }],
    });
  });

  test('reads the second grouping, which lays bands across the columns', () => {
    expect(readPageViewConfiguration({ groupBy: 'status', subGroupBy: 'priority' })).toEqual({
      ...EMPTY_PAGE_VIEW_CONFIGURATION,
      groupBy: 'status',
      subGroupBy: 'priority',
    });
  });

  test('reads a configuration that only carries grouping', () => {
    expect(readPageViewConfiguration({ groupBy: 'status' })).toEqual({
      ...EMPTY_PAGE_VIEW_CONFIGURATION,
      groupBy: 'status',
    });
  });

  test('reads what a board keeps about its own columns, which is of the view and not of the values', () => {
    const stored = { collapsedGroups: ['done'], columnLimits: { todo: 5 }, hidesUnassignedColumn: true };

    expect(readPageViewConfiguration(stored)).toEqual({ ...EMPTY_PAGE_VIEW_CONFIGURATION, ...stored });
  });

  test('reads what a table keeps about its own columns: how wide, and how many stay put', () => {
    const stored = { columnWidths: { dueDate: 240 }, frozenColumns: 2 };

    expect(readPageViewConfiguration(stored)).toEqual({ ...EMPTY_PAGE_VIEW_CONFIGURATION, ...stored });
  });

  test('refuses a width nobody could read, and one that would not fit', () => {
    expect(pageViewConfigurationSchema.safeParse({ columnWidths: { dueDate: 10 } }).success).toBe(false);
    expect(pageViewConfigurationSchema.safeParse({ columnWidths: { dueDate: 5000 } }).success).toBe(false);
  });

  test('reads what each column says at its foot, by the property the column is', () => {
    expect(readPageViewConfiguration({ calculations: { dueDate: 'COUNT_EMPTY', tokens: 'SUM' } }).calculations).toEqual(
      {
        dueDate: 'COUNT_EMPTY',
        tokens: 'SUM',
      },
    );
  });

  test('reads what a timeline keeps: where a row ends, and how long a day is drawn', () => {
    const stored = { dateProperty: 'begin', dateScale: 'WEEK', endDateProperty: 'due' } as const;

    expect(readPageViewConfiguration(stored)).toEqual({ ...EMPTY_PAGE_VIEW_CONFIGURATION, ...stored });
  });

  test('a view that never chose a scale opens by month, with no end property and no cover', () => {
    const configuration = readPageViewConfiguration({});

    expect(configuration.dateScale).toBe('MONTH');
    expect(configuration.endDateProperty).toBeNull();
    expect(configuration.coverProperty).toBeNull();
    expect(configuration.cardSize).toBe('MEDIUM');
  });

  test('reads what a gallery or a board keeps about its cards: the size and where the cover comes from', () => {
    const stored = { cardSize: 'LARGE', coverProperty: 'photos' } as const;

    expect(readPageViewConfiguration(stored)).toEqual({ ...EMPTY_PAGE_VIEW_CONFIGURATION, ...stored });
  });

  test('refuses a scale or a card size that does not exist', () => {
    expect(pageViewConfigurationSchema.safeParse({ dateScale: 'YEAR' }).success).toBe(false);
    expect(pageViewConfigurationSchema.safeParse({ cardSize: 'HUGE' }).success).toBe(false);
  });

  test('reads the columns whose text is wrapped one by one', () => {
    const stored = { columnWraps: { notes: true } };

    expect(readPageViewConfiguration(stored).columnWraps).toEqual({ notes: true });
    expect(pageViewConfigurationSchema.safeParse({ columnWraps: { notes: false } }).success).toBe(false);
  });

  test('keeps the rest of the configuration when it carries an unknown key', () => {
    expect(readPageViewConfiguration({ groupBy: 'status', unknownKey: 'ignored' }).groupBy).toBe('status');
  });

  test('falls back to an empty configuration when the stored value is unusable', () => {
    expect(readPageViewConfiguration({ sorts: 'not-a-list' })).toEqual(EMPTY_PAGE_VIEW_CONFIGURATION);
    expect(readPageViewConfiguration(null)).toEqual(EMPTY_PAGE_VIEW_CONFIGURATION);
  });
});

describe('validating a view configuration before it is stored', () => {
  test('accepts a nested filter group', () => {
    const configuration = {
      filter: {
        conditions: [doingCondition, { conditions: [doingCondition], kind: 'GROUP', operator: 'OR' }],
        kind: 'GROUP',
        operator: PAGE_FILTER_GROUP_OPERATOR.AND,
      },
    };

    expect(pageViewConfigurationSchema.safeParse(configuration).success).toBe(true);
  });

  test('rejects an unknown key', () => {
    expect(pageViewConfigurationSchema.safeParse({ groupBy: 'status', unknownKey: 1 }).success).toBe(false);
  });

  test('accepts a range of days as the value of a date condition, which matches what overlaps it', () => {
    const window = {
      conditions: [
        {
          kind: 'CONDITION',
          operator: 'IS',
          propertyKey: 'when',
          value: { end: '2026-09-30', start: '2026-09-01' },
        },
      ],
      kind: 'GROUP',
      operator: 'AND',
    };

    expect(pageViewConfigurationSchema.safeParse({ filter: window }).success).toBe(true);
  });

  test('rejects a range of days that is not made of a start and an end', () => {
    const odd = { kind: 'CONDITION', operator: 'IS', propertyKey: 'when', value: { from: '2026-09-01' } };

    expect(pageViewConfigurationSchema.safeParse({ filter: odd }).success).toBe(false);
  });

  test('rejects an unknown operator', () => {
    expect(
      pageViewConfigurationSchema.safeParse({ filter: { ...doingCondition, operator: 'MATCHES_REGEX' } }).success,
    ).toBe(false);
  });

  test('accepts the properties a view chooses to show', () => {
    expect(pageViewConfigurationSchema.safeParse({ visibleProperties: ['status', 'assignee'] }).success).toBe(true);
  });

  test('tells apart choosing nothing from not choosing', () => {
    expect(readPageViewConfiguration({}).visibleProperties).toBeNull();
    expect(readPageViewConfiguration({ visibleProperties: [] }).visibleProperties).toEqual([]);
  });

  test('reads back the properties a view chose', () => {
    expect(readPageViewConfiguration({ visibleProperties: ['status'] }).visibleProperties).toEqual(['status']);
  });

  test('rejects a filter nested deeper than allowed', () => {
    const tooDeep = {
      conditions: [
        {
          conditions: [{ conditions: [doingCondition], kind: 'GROUP', operator: 'OR' }],
          kind: 'GROUP',
          operator: 'OR',
        },
      ],
      kind: 'GROUP',
      operator: 'AND',
    };

    expect(pageViewConfigurationSchema.safeParse({ filter: tooDeep }).success).toBe(false);
  });
});
