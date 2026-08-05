import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType, PageLifecycle } from '@company-brain/db';
import { buildPageViewOutcome } from '@/modules/pages/domain/page-view.domain';
import type { PageRowSummary } from '@/modules/pages/types/page-schema.types';

const titleProperty = { key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null };
const statusProperty = {
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: ['todo', 'done'],
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

    expect(outcome).toEqual({ kind: 'TABLE_ROWS', rows });
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

    expect(outcome.kind).toBe('BOARD_COLUMNS');
    if (outcome.kind !== 'BOARD_COLUMNS') throw new Error('unreachable');
    expect(outcome.columns.map((column) => column.key)).toEqual(['todo', 'done', 'unassigned']);
  });

  it('treats a row with no property values as unassigned rather than crashing', () => {
    const rows = [buildRow({ id: 'a', order: 0, propertyValues: null })];

    const outcome = buildPageViewOutcome(
      { configuration: { groupBy: 'status' }, isDefault: true, name: 'Board', type: DatabaseViewType.BOARD },
      [titleProperty, statusProperty],
      rows,
    );

    expect(outcome.kind).toBe('BOARD_COLUMNS');
    if (outcome.kind !== 'BOARD_COLUMNS') throw new Error('unreachable');
    const unassigned = outcome.columns.find((column) => column.key === 'unassigned');
    expect(unassigned?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('signals a missing grouping property instead of returning a silently empty board', () => {
    const rows = [buildRow({ id: 'a', order: 0, propertyValues: { status: 'todo' } })];

    const outcome = buildPageViewOutcome(
      { configuration: { groupBy: 'status' }, isDefault: true, name: 'Board', type: DatabaseViewType.BOARD },
      [titleProperty],
      rows,
    );

    expect(outcome).toEqual({ kind: 'BOARD_MISSING_GROUPING_PROPERTY' });
  });
});
