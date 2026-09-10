import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import { PAGE_OPTION_COLOR } from '@company-brain/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { groupRowsForView } from '@/common/domain/schema-view-grouping.domain';

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

describe('groupRowsForView', () => {
  it('groups rows by configured select options with a stable unassigned group', () => {
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'status' },
      [statusProperty],
      [
        { id: 'b', order: 1, propertyValues: { status: 'done' } },
        { id: 'a', order: 0, propertyValues: {} },
      ],
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue().map((group) => group.key)).toEqual(['todo', 'done', 'unassigned']);
    expect(result.getValue().map((group) => group.color)).toEqual(['GREEN', null, null]);
    expect(result.getValue()[2]?.label).toBe('Unassigned');
    expect(result.getValue()[2]?.rows[0]?.id).toBe('a');
  });

  it('orders rows within a group by order then id', () => {
    const result = groupRowsForView(
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

  it('rejects a view that does not read its rows in groups', () => {
    const result = groupRowsForView(DatabaseViewType.TABLE, { groupBy: 'status' }, [statusProperty], []);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_VIEW_INVALID');
  });

  /**
   * Una fecha no declara de antemano qué días existen, así que las columnas
   * salen de los días que las filas nombran, en orden y sin repetirse.
   */
  it('makes a column per value the rows carry when the property declares none', () => {
    const dueDate = {
      key: 'dueDate',
      label: 'Due date',
      options: null,
      required: false,
      type: DatabasePropertyType.DATE,
    };
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'dueDate' },
      [dueDate],
      [
        { id: 'b', order: 1, propertyValues: { dueDate: '2026-09-11' } },
        { id: 'a', order: 0, propertyValues: { dueDate: '2026-09-10' } },
        { id: 'c', order: 2, propertyValues: { dueDate: '2026-09-10' } },
        { id: 'd', order: 3, propertyValues: {} },
      ],
    );

    expect(result.getValue().map((group) => group.key)).toEqual(['2026-09-10', '2026-09-11', 'unassigned']);
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['a', 'c']);
    expect(result.getValue()[2]?.rows.map((row) => row.id)).toEqual(['d']);
  });

  it('makes the two columns a checkbox has, even when no row answered yet', () => {
    const done = { key: 'done', label: 'Done', options: null, required: false, type: DatabasePropertyType.CHECKBOX };
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'done' },
      [done],
      [{ id: 'a', order: 0, propertyValues: { done: true } }],
    );

    expect(result.getValue().map((group) => group.key)).toEqual(['true', 'false', 'unassigned']);
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('rejects a board whose groupBy does not reference a SELECT property', () => {
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'title' },
      [{ key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null }],
      [],
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_VIEW_INVALID');
  });
});
