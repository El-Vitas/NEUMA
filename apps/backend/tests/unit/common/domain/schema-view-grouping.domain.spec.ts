import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import { groupRowsByBoard } from '@/common/domain/schema-view-grouping.domain';

const statusProperty = {
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: ['todo', 'done'],
};

describe('groupRowsByBoard', () => {
  it('groups rows by configured select options with a stable unassigned column', () => {
    const result = groupRowsByBoard(
      DatabaseViewType.BOARD,
      { groupBy: 'status' },
      [statusProperty],
      [
        { id: 'b', order: 1, propertyValues: { status: 'done' } },
        { id: 'a', order: 0, propertyValues: {} },
      ],
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue().map((column) => column.key)).toEqual(['todo', 'done', 'unassigned']);
    expect(result.getValue()[2]?.label).toBe('Unassigned');
    expect(result.getValue()[2]?.rows[0]?.id).toBe('a');
  });

  it('orders rows within a column by order then id', () => {
    const result = groupRowsByBoard(
      DatabaseViewType.BOARD,
      { groupBy: 'status' },
      [statusProperty],
      [
        { id: 'z', order: 0, propertyValues: { status: 'todo' } },
        { id: 'y', order: 0, propertyValues: { status: 'todo' } },
      ],
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['y', 'z']);
  });

  it('rejects a view that is not a board', () => {
    const result = groupRowsByBoard(DatabaseViewType.TABLE, { groupBy: 'status' }, [statusProperty], []);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_VIEW_INVALID');
  });

  it('rejects a board whose groupBy does not reference a SELECT property', () => {
    const result = groupRowsByBoard(
      DatabaseViewType.BOARD,
      { groupBy: 'title' },
      [{ key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null }],
      [],
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_VIEW_INVALID');
  });
});
