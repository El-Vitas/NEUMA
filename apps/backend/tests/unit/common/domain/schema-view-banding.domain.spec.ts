import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@neuma/db';
import { PAGE_OPTION_COLOR } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { bandRowsForView } from '@/common/domain/schema-view-banding.domain';

const statusProperty: SchemaPropertyDefinition = {
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: PAGE_OPTION_COLOR.GREEN, value: 'todo' },
    { color: null, value: 'done' },
  ],
};

const priorityProperty: SchemaPropertyDefinition = {
  key: 'priority',
  label: 'Priority',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: PAGE_OPTION_COLOR.RED, value: 'high' },
    { color: null, value: 'low' },
  ],
};

const properties = [statusProperty, priorityProperty];

describe('bandRowsForView', () => {
  it('lays one band per sub-group value, each holding every column', () => {
    const result = bandRowsForView(DatabaseViewType.BOARD, { groupBy: 'status', subGroupBy: 'priority' }, properties, [
      { id: 'a', order: 0, propertyValues: { priority: 'high', status: 'todo' } },
    ]);

    expect(result.isOk()).toBe(true);
    expect(result.getValue().map((band) => band.key)).toEqual(['high', 'low', 'unassigned']);
    for (const band of result.getValue()) {
      expect(band.groups.map((group) => group.key)).toEqual(['todo', 'done', 'unassigned']);
    }
  });

  it('drops each row into the crossing of its two values', () => {
    const result = bandRowsForView(DatabaseViewType.BOARD, { groupBy: 'status', subGroupBy: 'priority' }, properties, [
      { id: 'a', order: 0, propertyValues: { priority: 'high', status: 'todo' } },
      { id: 'b', order: 1, propertyValues: { priority: 'low', status: 'done' } },
    ]);
    const [high, low] = result.getValue();

    expect(high?.groups[0]?.rows.map((row) => row.id)).toEqual(['a']);
    expect(high?.groups[1]?.rows).toEqual([]);
    expect(low?.groups[1]?.rows.map((row) => row.id)).toEqual(['b']);
  });

  it('sends a row without a sub-group value to the unassigned band, keeping its column', () => {
    const result = bandRowsForView(DatabaseViewType.BOARD, { groupBy: 'status', subGroupBy: 'priority' }, properties, [
      { id: 'a', order: 0, propertyValues: { status: 'done' } },
    ]);
    const bands = result.getValue();

    expect(bands[2]?.key).toBe('unassigned');
    expect(bands[2]?.groups[1]?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('keeps the colors of both properties, so a band and a column read at a glance', () => {
    const result = bandRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'status', subGroupBy: 'priority' },
      properties,
      [],
    );

    expect(result.getValue().map((band) => band.color)).toEqual(['RED', null, null]);
    expect(result.getValue()[0]?.groups.map((group) => group.color)).toEqual(['GREEN', null, null]);
  });

  it('refuses a view that says nothing about its second grouping', () => {
    expect(bandRowsForView(DatabaseViewType.BOARD, { groupBy: 'status' }, properties, []).isFail()).toBe(true);
  });

  it('refuses a second grouping that cannot make groups', () => {
    const notes: SchemaPropertyDefinition = {
      key: 'notes',
      label: 'Notes',
      options: null,
      required: false,
      type: DatabasePropertyType.RICH_TEXT,
    };

    expect(
      bandRowsForView(
        DatabaseViewType.BOARD,
        { groupBy: 'status', subGroupBy: 'notes' },
        [statusProperty, notes],
        [],
      ).isFail(),
    ).toBe(true);
  });

  it('refuses a view that does not lay its rows in bands', () => {
    expect(
      bandRowsForView(DatabaseViewType.TABLE, { groupBy: 'status', subGroupBy: 'priority' }, properties, []).isFail(),
    ).toBe(true);
  });
});
