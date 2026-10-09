import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, PageLifecycle } from '@neuma/db';
import { buildPageViewOutcome, countPageViewRows } from '@/modules/pages/domain/page-view.domain';
import type { PageRowSummary } from '@/modules/pages/types/page-schema.types';

const titleProperty = { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null };
const statusProperty = {
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: null, value: 'todo' },
    { color: null, value: 'done' },
  ],
};

const buildRow = (overrides: Partial<PageRowSummary>): PageRowSummary => ({
  id: 'row-a',
  lifecycle: PageLifecycle.ACTIVE,
  order: 0,
  parentId: 'page-a',
  propertyValues: {},
  spaceId: 'space-a',
  title: 'Row A',
  ...overrides,
});

describe('buildPageViewOutcome — table view', () => {
  it('returns rows in the order they were given', () => {
    const rows = [buildRow({ id: 'a', order: 0 }), buildRow({ id: 'b', order: 1 })];

    const outcome = buildPageViewOutcome(
      { configuration: {}, isDefault: true, name: 'Table', type: DatabaseViewType.TABLE },
      [titleProperty],
      rows,
    );

    expect(outcome).toEqual({ kind: 'FLAT_ROWS', rows });
  });
});

describe('buildPageViewOutcome — board view', () => {
  it('groups rows into columns by the configured select property', () => {
    const rows = [
      buildRow({ id: 'a', order: 0, propertyValues: { status: 'todo' } }),
      buildRow({ id: 'b', order: 1, propertyValues: { status: 'done' } }),
    ];

    const outcome = buildPageViewOutcome(
      { configuration: { groupBy: 'status' }, isDefault: true, name: 'Board', type: DatabaseViewType.BOARD },
      [titleProperty, statusProperty],
      rows,
    );

    expect(outcome.kind).toBe('GROUPED_ROWS');
    if (outcome.kind !== 'GROUPED_ROWS') throw new Error('unreachable');
    expect(outcome.groups.map((group) => group.key)).toEqual(['todo', 'done', 'unassigned']);
  });

  it('treats a row with no property values as unassigned rather than crashing', () => {
    const rows = [buildRow({ id: 'a', order: 0, propertyValues: null })];

    const outcome = buildPageViewOutcome(
      { configuration: { groupBy: 'status' }, isDefault: true, name: 'Board', type: DatabaseViewType.BOARD },
      [titleProperty, statusProperty],
      rows,
    );

    expect(outcome.kind).toBe('GROUPED_ROWS');
    if (outcome.kind !== 'GROUPED_ROWS') throw new Error('unreachable');
    const unassigned = outcome.groups.find((group) => group.key === 'unassigned');
    expect(unassigned?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('signals a missing grouping property instead of returning a silently empty board', () => {
    const rows = [buildRow({ id: 'a', order: 0, propertyValues: { status: 'todo' } })];

    const outcome = buildPageViewOutcome(
      { configuration: { groupBy: 'status' }, isDefault: true, name: 'Board', type: DatabaseViewType.BOARD },
      [titleProperty],
      rows,
    );

    expect(outcome).toEqual({ kind: 'MISSING_GROUPING_PROPERTY' });
  });
});

describe('buildPageViewOutcome — filtering', () => {
  it('keeps only the rows matching the stored filter', () => {
    const rows = [
      buildRow({ id: 'a', order: 0, propertyValues: { status: 'todo' } }),
      buildRow({ id: 'b', order: 1, propertyValues: { status: 'done' } }),
    ];

    const outcome = buildPageViewOutcome(
      {
        configuration: { filter: { kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'todo' } },
        isDefault: true,
        name: 'Table',
        type: DatabaseViewType.TABLE,
      },
      [titleProperty, statusProperty],
      rows,
    );

    expect(outcome.kind).toBe('FLAT_ROWS');
    if (outcome.kind !== 'FLAT_ROWS') throw new Error('unreachable');
    expect(outcome.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('shows every row when the stored filter cannot be honoured', () => {
    const rows = [buildRow({ id: 'a', order: 0 }), buildRow({ id: 'b', order: 1 })];

    const outcome = buildPageViewOutcome(
      {
        configuration: { filter: { kind: 'CONDITION', operator: 'IS', propertyKey: 'missing', value: 'todo' } },
        isDefault: true,
        name: 'Table',
        type: DatabaseViewType.TABLE,
      },
      [titleProperty, statusProperty],
      rows,
    );

    expect(outcome.kind).toBe('FLAT_ROWS');
    if (outcome.kind !== 'FLAT_ROWS') throw new Error('unreachable');
    expect(outcome.rows.map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('ignores a configuration it cannot read at all', () => {
    const rows = [buildRow({ id: 'a', order: 0 })];

    const outcome = buildPageViewOutcome(
      { configuration: { filter: 'nonsense' }, isDefault: true, name: 'Table', type: DatabaseViewType.TABLE },
      [titleProperty],
      rows,
    );

    expect(outcome).toEqual({ kind: 'FLAT_ROWS', rows });
  });
});

describe('buildPageViewOutcome — ordering', () => {
  it('applies the stored sort ahead of the row order', () => {
    const rows = [
      buildRow({ id: 'a', order: 0, propertyValues: { status: 'todo' } }),
      buildRow({ id: 'b', order: 1, propertyValues: { status: 'done' } }),
    ];

    const outcome = buildPageViewOutcome(
      {
        configuration: { sorts: [{ direction: 'ASCENDING', propertyKey: 'status' }] },
        isDefault: true,
        name: 'Table',
        type: DatabaseViewType.TABLE,
      },
      [titleProperty, statusProperty],
      rows,
    );

    expect(outcome.kind).toBe('FLAT_ROWS');
    if (outcome.kind !== 'FLAT_ROWS') throw new Error('unreachable');
    expect(outcome.rows.map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('orders the cards inside a board column by the stored sort', () => {
    const rows = [
      buildRow({ id: 'a', order: 0, propertyValues: { status: 'todo', title: 'Zeta' }, title: 'Zeta' }),
      buildRow({ id: 'b', order: 1, propertyValues: { status: 'todo', title: 'Alpha' }, title: 'Alpha' }),
    ];

    const outcome = buildPageViewOutcome(
      {
        configuration: { groupBy: 'status', sorts: [{ direction: 'ASCENDING', propertyKey: 'title' }] },
        isDefault: true,
        name: 'Board',
        type: DatabaseViewType.BOARD,
      },
      [titleProperty, statusProperty],
      rows,
    );

    expect(outcome.kind).toBe('GROUPED_ROWS');
    if (outcome.kind !== 'GROUPED_ROWS') throw new Error('unreachable');
    const todoGroup = outcome.groups.find((group) => group.key === 'todo');
    expect(todoGroup?.rows.map((row) => row.id)).toEqual(['b', 'a']);
  });
});

describe('countPageViewRows', () => {
  it('counts the rows of a view that reads them one after another', () => {
    expect(countPageViewRows({ kind: 'FLAT_ROWS', rows: [buildRow({ id: 'a' }), buildRow({ id: 'b' })] })).toBe(2);
  });

  it('adds up what every group holds', () => {
    const outcome = buildPageViewOutcome(
      { configuration: { groupBy: 'status' }, isDefault: true, name: 'Board', type: DatabaseViewType.BOARD },
      [titleProperty, statusProperty],
      [
        buildRow({ id: 'a', propertyValues: { status: 'todo' } }),
        buildRow({ id: 'b', propertyValues: { status: 'done' } }),
        buildRow({ id: 'c', propertyValues: {} }),
      ],
    );

    expect(countPageViewRows(outcome)).toBe(3);
  });

  it('counts none when the view could not even be read', () => {
    expect(countPageViewRows({ kind: 'MISSING_GROUPING_PROPERTY' })).toBe(0);
  });
});
