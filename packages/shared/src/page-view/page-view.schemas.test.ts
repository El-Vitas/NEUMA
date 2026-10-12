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
