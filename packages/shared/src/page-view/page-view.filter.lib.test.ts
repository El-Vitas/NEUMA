import { describe, expect, test } from 'bun:test';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE, PAGE_STATUS_GROUP } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { getPageFilterOperators, hasPageFilterPredicate, matchesPageFilter } from './page-view.filter.lib.js';
import type { PageFilter, PageFilterCondition, PageFilterOperator, PageViewProperty } from './page-view.types.js';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_FILTER_OPERATOR } from './page-view.types.js';

const properties: readonly PageViewProperty[] = [
  { key: 'title', type: PAGE_PROPERTY_TYPE.TITLE },
  { key: 'status', type: PAGE_PROPERTY_TYPE.SELECT },
  { key: 'labels', type: PAGE_PROPERTY_TYPE.MULTI_SELECT },
  { key: 'estimate', type: PAGE_PROPERTY_TYPE.NUMBER },
  { key: 'done', type: PAGE_PROPERTY_TYPE.CHECKBOX },
  { key: 'dueDate', type: PAGE_PROPERTY_TYPE.DATE },
  { key: 'owners', type: PAGE_PROPERTY_TYPE.PERSON },
  { key: 'related', type: PAGE_PROPERTY_TYPE.RELATION },
  { key: 'attachments', type: PAGE_PROPERTY_TYPE.FILES },
  {
    key: 'stage',
    options: [
      { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'todo0001', value: 'Backlog' },
      { color: null, group: PAGE_STATUS_GROUP.IN_PROGRESS, id: 'doing001', value: 'Doing' },
      { color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Done' },
    ],
    type: PAGE_PROPERTY_TYPE.STATUS,
  },
  { key: 'createdAt', type: PAGE_PROPERTY_TYPE.CREATED_TIME },
];

const row = {
  attachments: ['file-1'],
  createdAt: { start: '2026-08-10T14:30:00Z' },
  done: false,
  dueDate: { start: '2026-08-11' },
  estimate: 5,
  labels: ['backend', 'urgent'],
  owners: ['user-1', 'user-2'],
  related: ['row-1'],
  stage: 'doing001',
  status: 'doing',
  title: 'Ship the migration',
};

const condition = (
  propertyKey: string,
  operator: PageFilterOperator,
  value: PagePropertyValue | null,
): PageFilterCondition => ({ kind: 'CONDITION', operator, propertyKey, value });

describe('filtering rows by a single condition', () => {
  test('matches a tag property by equality', () => {
    expect(matchesPageFilter(condition('status', PAGE_FILTER_OPERATOR.IS, 'doing'), row, properties)).toBe(true);
    expect(matchesPageFilter(condition('status', PAGE_FILTER_OPERATOR.IS, 'done'), row, properties)).toBe(false);
  });

  test('matches text by containment, ignoring case', () => {
    expect(matchesPageFilter(condition('title', PAGE_FILTER_OPERATOR.CONTAINS, 'MIGRATION'), row, properties)).toBe(
      true,
    );
    expect(matchesPageFilter(condition('title', PAGE_FILTER_OPERATOR.NOT_CONTAINS, 'rollback'), row, properties)).toBe(
      true,
    );
  });

  test('matches a multi select by the entries it holds', () => {
    expect(matchesPageFilter(condition('labels', PAGE_FILTER_OPERATOR.CONTAINS, 'urgent'), row, properties)).toBe(true);
    expect(matchesPageFilter(condition('labels', PAGE_FILTER_OPERATOR.CONTAINS, 'design'), row, properties)).toBe(
      false,
    );
  });

  test('compares numbers', () => {
    expect(matchesPageFilter(condition('estimate', PAGE_FILTER_OPERATOR.IS_GREATER_THAN, 3), row, properties)).toBe(
      true,
    );
    expect(matchesPageFilter(condition('estimate', PAGE_FILTER_OPERATOR.IS_LESS_THAN, 3), row, properties)).toBe(false);
  });

  test('compares dates', () => {
    expect(matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS_BEFORE, '2026-09-01'), row, properties)).toBe(
      true,
    );
    expect(matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS_AFTER, '2026-09-01'), row, properties)).toBe(
      false,
    );
  });

  test('matches a checkbox by its state', () => {
    expect(matchesPageFilter(condition('done', PAGE_FILTER_OPERATOR.IS, false), row, properties)).toBe(true);
    expect(matchesPageFilter(condition('done', PAGE_FILTER_OPERATOR.IS, true), row, properties)).toBe(false);
  });

  test('matches a person list by the people it holds', () => {
    expect(matchesPageFilter(condition('owners', PAGE_FILTER_OPERATOR.CONTAINS, 'user-2'), row, properties)).toBe(true);
    expect(matchesPageFilter(condition('owners', PAGE_FILTER_OPERATOR.NOT_CONTAINS, 'user-2'), row, properties)).toBe(
      false,
    );
    expect(matchesPageFilter(condition('owners', PAGE_FILTER_OPERATOR.CONTAINS, 'user-9'), row, properties)).toBe(
      false,
    );
  });

  test('matches a relation by the rows it points to', () => {
    expect(matchesPageFilter(condition('related', PAGE_FILTER_OPERATOR.CONTAINS, 'row-1'), row, properties)).toBe(true);
    expect(matchesPageFilter(condition('related', PAGE_FILTER_OPERATOR.NOT_CONTAINS, 'row-1'), row, properties)).toBe(
      false,
    );
  });

  test('matches files only by whether there are any', () => {
    expect(matchesPageFilter(condition('attachments', PAGE_FILTER_OPERATOR.IS_NOT_EMPTY, null), row, properties)).toBe(
      true,
    );
    expect(
      matchesPageFilter(condition('attachments', PAGE_FILTER_OPERATOR.IS_EMPTY, null), { attachments: [] }, properties),
    ).toBe(true);
  });
});

describe('filtering rows by status', () => {
  test('matches one option by its id', () => {
    expect(matchesPageFilter(condition('stage', PAGE_FILTER_OPERATOR.IS, 'doing001'), row, properties)).toBe(true);
    expect(matchesPageFilter(condition('stage', PAGE_FILTER_OPERATOR.IS_NOT, 'doing001'), row, properties)).toBe(false);
  });

  test('matches a whole group', () => {
    expect(
      matchesPageFilter(
        condition('stage', PAGE_FILTER_OPERATOR.IS_IN_GROUP, PAGE_STATUS_GROUP.IN_PROGRESS),
        row,
        properties,
      ),
    ).toBe(true);
    expect(
      matchesPageFilter(
        condition('stage', PAGE_FILTER_OPERATOR.IS_IN_GROUP, PAGE_STATUS_GROUP.COMPLETE),
        row,
        properties,
      ),
    ).toBe(false);
    expect(
      matchesPageFilter(
        condition('stage', PAGE_FILTER_OPERATOR.IS_NOT_IN_GROUP, PAGE_STATUS_GROUP.COMPLETE),
        row,
        properties,
      ),
    ).toBe(true);
  });
});

describe('filtering rows by date ranges', () => {
  const trip = { dueDate: { end: '2026-08-20', start: '2026-08-15' } };

  test('a day is in the range when it falls between the ends, ends included', () => {
    expect(matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS, '2026-08-15'), trip, properties)).toBe(true);
    expect(matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS, '2026-08-17'), trip, properties)).toBe(true);
    expect(matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS, '2026-08-21'), trip, properties)).toBe(
      false,
    );
  });

  test('a range is before a day only when it ends before it', () => {
    expect(
      matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS_BEFORE, '2026-08-21'), trip, properties),
    ).toBe(true);
    expect(
      matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS_BEFORE, '2026-08-18'), trip, properties),
    ).toBe(false);
  });

  test('a range is after a day only when it starts after it', () => {
    expect(matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS_AFTER, '2026-08-14'), trip, properties)).toBe(
      true,
    );
    expect(matchesPageFilter(condition('dueDate', PAGE_FILTER_OPERATOR.IS_AFTER, '2026-08-15'), trip, properties)).toBe(
      false,
    );
  });

  test('an instant of creation matches the day it fell on', () => {
    expect(matchesPageFilter(condition('createdAt', PAGE_FILTER_OPERATOR.IS, '2026-08-10'), row, properties)).toBe(
      true,
    );
    expect(
      matchesPageFilter(condition('createdAt', PAGE_FILTER_OPERATOR.IS_AFTER, '2026-08-10'), row, properties),
    ).toBe(false);
  });
});

describe('filtering rows by emptiness', () => {
  test('treats a missing value as empty', () => {
    expect(matchesPageFilter(condition('status', PAGE_FILTER_OPERATOR.IS_EMPTY, null), {}, properties)).toBe(true);
    expect(matchesPageFilter(condition('status', PAGE_FILTER_OPERATOR.IS_NOT_EMPTY, null), {}, properties)).toBe(false);
  });

  test('treats an empty multi select as empty', () => {
    expect(
      matchesPageFilter(condition('labels', PAGE_FILTER_OPERATOR.IS_EMPTY, null), { labels: [] }, properties),
    ).toBe(true);
  });

  test('treats an unchecked checkbox as filled, not empty', () => {
    expect(matchesPageFilter(condition('done', PAGE_FILTER_OPERATOR.IS_EMPTY, null), row, properties)).toBe(false);
  });
});

describe('filtering rows by nested groups', () => {
  const doingFilter = condition('status', PAGE_FILTER_OPERATOR.IS, 'doing');
  const largeFilter = condition('estimate', PAGE_FILTER_OPERATOR.IS_GREATER_THAN, 8);

  test('requires every condition of an AND group', () => {
    const filter: PageFilter = {
      conditions: [doingFilter, largeFilter],
      kind: 'GROUP',
      operator: PAGE_FILTER_GROUP_OPERATOR.AND,
    };

    expect(matchesPageFilter(filter, row, properties)).toBe(false);
  });

  test('accepts any condition of an OR group', () => {
    const filter: PageFilter = {
      conditions: [doingFilter, largeFilter],
      kind: 'GROUP',
      operator: PAGE_FILTER_GROUP_OPERATOR.OR,
    };

    expect(matchesPageFilter(filter, row, properties)).toBe(true);
  });

  test('evaluates a group nested inside another group', () => {
    const filter: PageFilter = {
      conditions: [doingFilter, { conditions: [largeFilter], kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.OR }],
      kind: 'GROUP',
      operator: PAGE_FILTER_GROUP_OPERATOR.OR,
    };

    expect(matchesPageFilter(filter, row, properties)).toBe(true);
  });

  test('lets every row through an empty group', () => {
    const filter: PageFilter = { conditions: [], kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.AND };

    expect(matchesPageFilter(filter, row, properties)).toBe(true);
  });
});

describe('filtering rows when the filter cannot be honoured', () => {
  test('lets rows through when the property does not exist', () => {
    expect(matchesPageFilter(condition('missing', PAGE_FILTER_OPERATOR.IS, 'x'), row, properties)).toBe(true);
  });

  test('lets rows through when the operator does not apply to the property', () => {
    expect(matchesPageFilter(condition('done', PAGE_FILTER_OPERATOR.CONTAINS, 'x'), row, properties)).toBe(true);
  });

  test('lets rows through when the condition carries no value to compare', () => {
    expect(matchesPageFilter(condition('status', PAGE_FILTER_OPERATOR.IS, null), row, properties)).toBe(true);
  });
});

describe('offering operators per logical type', () => {
  test('offers containment for text and only equality for tags', () => {
    expect(getPageFilterOperators(PAGE_PROPERTY_LOGICAL_TYPE.TEXT)).toContain(PAGE_FILTER_OPERATOR.CONTAINS);
    expect(getPageFilterOperators(PAGE_PROPERTY_LOGICAL_TYPE.TAG)).not.toContain(PAGE_FILTER_OPERATOR.CONTAINS);
  });

  test('always offers the emptiness operators', () => {
    const everyLogicalType = Object.values(PAGE_PROPERTY_LOGICAL_TYPE);

    for (const logicalType of everyLogicalType) {
      expect(getPageFilterOperators(logicalType)).toContain(PAGE_FILTER_OPERATOR.IS_EMPTY);
      expect(getPageFilterOperators(logicalType)).toContain(PAGE_FILTER_OPERATOR.IS_NOT_EMPTY);
    }
  });

  test('backs every offered value operator with a predicate', () => {
    const everyLogicalType = Object.values(PAGE_PROPERTY_LOGICAL_TYPE);

    for (const logicalType of everyLogicalType) {
      const valueOperators = getPageFilterOperators(logicalType).filter(
        (operator) => operator !== PAGE_FILTER_OPERATOR.IS_EMPTY && operator !== PAGE_FILTER_OPERATOR.IS_NOT_EMPTY,
      );
      for (const operator of valueOperators) {
        expect(hasPageFilterPredicate(logicalType, operator)).toBe(true);
      }
    }
  });
});
