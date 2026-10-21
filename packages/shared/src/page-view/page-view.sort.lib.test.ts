import { describe, expect, test } from 'bun:test';
import type { PagePropertyValues } from '../page-property/page-property.types.js';
import { PAGE_STATUS_GROUP } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { comparePageRowsBySorts } from './page-view.sort.lib.js';
import type { PageSort, PageViewProperty } from './page-view.types.js';
import { PAGE_SORT_DIRECTION } from './page-view.types.js';

const priorities = [
  { color: null, group: null, id: 'low00001', value: 'Low' },
  { color: null, group: null, id: 'high0001', value: 'High' },
  { color: null, group: null, id: 'mid00001', value: 'Mid' },
] as const;

const properties: readonly PageViewProperty[] = [
  { key: 'title', type: PAGE_PROPERTY_TYPE.TITLE },
  { key: 'estimate', type: PAGE_PROPERTY_TYPE.NUMBER },
  { key: 'dueDate', type: PAGE_PROPERTY_TYPE.DATE },
  { key: 'done', type: PAGE_PROPERTY_TYPE.CHECKBOX },
  { key: 'priority', options: priorities, type: PAGE_PROPERTY_TYPE.SELECT },
  { key: 'labels', options: priorities, type: PAGE_PROPERTY_TYPE.MULTI_SELECT },
  {
    key: 'stage',
    options: [
      { color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Done' },
      { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'later001', value: 'Later' },
      { color: null, group: PAGE_STATUS_GROUP.IN_PROGRESS, id: 'doing001', value: 'Doing' },
      { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'next0001', value: 'Next' },
    ],
    type: PAGE_PROPERTY_TYPE.STATUS,
  },
  { key: 'related', type: PAGE_PROPERTY_TYPE.RELATION },
  { key: 'code', type: PAGE_PROPERTY_TYPE.UNIQUE_ID },
  { key: 'createdAt', type: PAGE_PROPERTY_TYPE.CREATED_TIME },
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
    const rows = [{ dueDate: { start: '2026-09-01' } }, { dueDate: { start: '2026-01-15' } }];

    expect(sortRows(rows, ascendingBy('dueDate'))).toEqual([
      { dueDate: { start: '2026-01-15' } },
      { dueDate: { start: '2026-09-01' } },
    ]);
  });

  test('orders ranges by their start and then by their end', () => {
    const rows = [
      { dueDate: { end: '2026-09-09', start: '2026-09-01' } },
      { dueDate: { end: '2026-09-03', start: '2026-09-01' } },
      { dueDate: { start: '2026-08-01' } },
    ];

    expect(sortRows(rows, ascendingBy('dueDate'))).toEqual([
      { dueDate: { start: '2026-08-01' } },
      { dueDate: { end: '2026-09-03', start: '2026-09-01' } },
      { dueDate: { end: '2026-09-09', start: '2026-09-01' } },
    ]);
  });

  test('orders a select by the position of its options, not by their names', () => {
    const rows = [{ priority: 'mid00001' }, { priority: 'low00001' }, { priority: 'high0001' }];

    expect(sortRows(rows, ascendingBy('priority'))).toEqual([
      { priority: 'low00001' },
      { priority: 'high0001' },
      { priority: 'mid00001' },
    ]);
  });

  test('orders a multi select by the first of its options in the list', () => {
    const rows = [{ labels: ['mid00001'] }, { labels: ['high0001', 'low00001'] }];

    expect(sortRows(rows, ascendingBy('labels'))).toEqual([
      { labels: ['high0001', 'low00001'] },
      { labels: ['mid00001'] },
    ]);
  });

  test('orders a status by group first and by position inside the group', () => {
    const rows = [{ stage: 'done0001' }, { stage: 'doing001' }, { stage: 'next0001' }, { stage: 'later001' }];

    expect(sortRows(rows, ascendingBy('stage'))).toEqual([
      { stage: 'later001' },
      { stage: 'next0001' },
      { stage: 'doing001' },
      { stage: 'done0001' },
    ]);
  });

  test('orders a relation by how many rows it points to', () => {
    const rows = [{ related: ['a', 'b'] }, { related: ['a'] }];

    expect(sortRows(rows, ascendingBy('related'))).toEqual([{ related: ['a'] }, { related: ['a', 'b'] }]);
  });

  test('orders a unique id as a number and the creation time as a date', () => {
    expect(sortRows([{ code: 10 }, { code: 9 }], ascendingBy('code'))).toEqual([{ code: 9 }, { code: 10 }]);
    expect(
      sortRows(
        [{ createdAt: { start: '2026-08-11T10:00:00Z' } }, { createdAt: { start: '2026-08-11T09:00:00Z' } }],
        ascendingBy('createdAt'),
      ),
    ).toEqual([{ createdAt: { start: '2026-08-11T09:00:00Z' } }, { createdAt: { start: '2026-08-11T10:00:00Z' } }]);
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
