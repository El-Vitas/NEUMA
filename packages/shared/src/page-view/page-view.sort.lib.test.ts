import { describe, expect, test } from 'bun:test';
import type { PagePropertyValues } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { comparePageRowsBySorts } from './page-view.sort.lib.js';
import type { PageSort, PageViewProperty } from './page-view.types.js';
import { PAGE_SORT_DIRECTION } from './page-view.types.js';

const properties: readonly PageViewProperty[] = [
  { key: 'title', type: PAGE_PROPERTY_TYPE.TITLE },
  { key: 'estimate', type: PAGE_PROPERTY_TYPE.NUMBER },
  { key: 'dueDate', type: PAGE_PROPERTY_TYPE.DATE },
  { key: 'done', type: PAGE_PROPERTY_TYPE.CHECKBOX },
];

const ascendingBy = (propertyKey: string): readonly PageSort[] => [
  { direction: PAGE_SORT_DIRECTION.ASCENDING, propertyKey },
];

const descendingBy = (propertyKey: string): readonly PageSort[] => [
  { direction: PAGE_SORT_DIRECTION.DESCENDING, propertyKey },
];

const sortRows = (rows: readonly PagePropertyValues[], sorts: readonly PageSort[]): readonly PagePropertyValues[] =>
  [...rows].sort((left, right) => comparePageRowsBySorts(sorts, left, right, properties));

describe('ordering rows by one property', () => {
  test('orders numbers ascending and descending', () => {
    const rows = [{ estimate: 8 }, { estimate: 2 }, { estimate: 5 }];

    expect(sortRows(rows, ascendingBy('estimate'))).toEqual([{ estimate: 2 }, { estimate: 5 }, { estimate: 8 }]);
    expect(sortRows(rows, descendingBy('estimate'))).toEqual([{ estimate: 8 }, { estimate: 5 }, { estimate: 2 }]);
  });

  test('orders text alphabetically', () => {
    const rows = [{ title: 'Zeta' }, { title: 'alpha' }, { title: 'Beta' }];

    expect(sortRows(rows, ascendingBy('title'))).toEqual([{ title: 'alpha' }, { title: 'Beta' }, { title: 'Zeta' }]);
  });

  test('orders dates chronologically', () => {
    const rows = [{ dueDate: '2026-09-01' }, { dueDate: '2026-01-15' }];

    expect(sortRows(rows, ascendingBy('dueDate'))).toEqual([{ dueDate: '2026-01-15' }, { dueDate: '2026-09-01' }]);
  });

  test('orders unchecked before checked', () => {
    const rows = [{ done: true }, { done: false }];

    expect(sortRows(rows, ascendingBy('done'))).toEqual([{ done: false }, { done: true }]);
  });
});

describe('ordering rows with missing values', () => {
  const rowsWithGap: readonly PagePropertyValues[] = [{}, { estimate: 3 }];

  test('pushes empty values last when ascending', () => {
    expect(sortRows(rowsWithGap, ascendingBy('estimate'))).toEqual([{ estimate: 3 }, {}]);
  });

  test('keeps empty values last when descending', () => {
    expect(sortRows(rowsWithGap, descendingBy('estimate'))).toEqual([{ estimate: 3 }, {}]);
  });
});

describe('ordering rows by several properties', () => {
  test('falls back to the next sort when the first ties', () => {
    const rows = [
      { estimate: 5, title: 'Beta' },
      { estimate: 5, title: 'Alpha' },
      { estimate: 1, title: 'Gamma' },
    ];
    const sorts: readonly PageSort[] = [
      { direction: PAGE_SORT_DIRECTION.ASCENDING, propertyKey: 'estimate' },
      { direction: PAGE_SORT_DIRECTION.ASCENDING, propertyKey: 'title' },
    ];

    expect(sortRows(rows, sorts)).toEqual([
      { estimate: 1, title: 'Gamma' },
      { estimate: 5, title: 'Alpha' },
      { estimate: 5, title: 'Beta' },
    ]);
  });

  test('ignores a sort that references a property the schema does not declare', () => {
    const rows = [{ estimate: 2 }, { estimate: 1 }];

    expect(sortRows(rows, ascendingBy('missing'))).toEqual([{ estimate: 2 }, { estimate: 1 }]);
  });
});
