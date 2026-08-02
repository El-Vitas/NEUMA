import { describe, expect, it } from 'bun:test';
import { DatabaseLifecycle, DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import { groupRecordsByBoard } from '@/modules/databases/domain/database.views.domain';

describe('database board grouping', () => {
  it('groups records by configured select options with a stable unassigned column', () => {
    const result = groupRecordsByBoard(
      DatabaseViewType.BOARD,
      { groupBy: 'status' },
      [
        {
          key: 'status',
          label: 'Status',
          type: DatabasePropertyType.SELECT,
          required: false,
          options: ['todo', 'done'],
        },
      ],
      [
        {
          databaseId: 'database-a',
          id: 'b',
          lifecycle: DatabaseLifecycle.ACTIVE,
          title: 'Second',
          propertyValues: { status: 'done' },
          order: 1,
        },
        {
          databaseId: 'database-a',
          id: 'a',
          lifecycle: DatabaseLifecycle.ACTIVE,
          title: 'First',
          propertyValues: {},
          order: 0,
        },
      ],
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue().map((column) => column.key)).toEqual(['todo', 'done', 'unassigned']);
    expect(result.getValue()[2]?.label).toBe('Unassigned');
    expect(result.getValue()[2]?.records[0]?.id).toBe('a');
  });

  it('rejects a board that groups by a non-select property', () => {
    const result = groupRecordsByBoard(
      DatabaseViewType.BOARD,
      { groupBy: 'title' },
      [{ key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null }],
      [],
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('DATABASE_VIEW_INVALID');
  });
});
