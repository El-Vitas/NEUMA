import { describe, expect, test } from 'bun:test';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE } from '../page-property/page-property.types.js';
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
];

const row = {
  done: false,
  dueDate: '2026-08-11',
  estimate: 5,
  labels: ['backend', 'urgent'],
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
