import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType, DatabaseViewType } from '@neuma/db';
import { DEFAULT_PAGE_PROPERTY_CONFIG, PAGE_OPTION_COLOR, PAGE_STATUS_GROUP } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { groupRowsForView } from '@/common/domain/schema-view-grouping.domain';

const statusProperty: SchemaPropertyDefinition = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'status',
  label: 'Status',
  type: DatabasePropertyType.SELECT,
  required: false,
  options: [
    { color: PAGE_OPTION_COLOR.GREEN, group: null, id: 'todo0001', value: 'todo' },
    { color: null, group: null, id: 'done0001', value: 'done' },
  ],
};

const stageProperty: SchemaPropertyDefinition = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'stage',
  label: 'Stage',
  type: DatabasePropertyType.STATUS,
  required: false,
  options: [
    { color: null, group: PAGE_STATUS_GROUP.TO_DO, id: 'next0001', value: 'Next' },
    { color: null, group: PAGE_STATUS_GROUP.IN_PROGRESS, id: 'doing001', value: 'Doing' },
    { color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Done' },
  ],
};

const dueDate: SchemaPropertyDefinition = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'dueDate',
  label: 'Due date',
  options: null,
  required: false,
  type: DatabasePropertyType.DATE,
};

describe('groupRowsForView', () => {
  it('groups rows by the id of the configured select options with a stable unassigned group', () => {
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'status' },
      [statusProperty],
      [
        { id: 'b', order: 1, propertyValues: { status: 'done0001' } },
        { id: 'a', order: 0, propertyValues: {} },
      ],
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue().map((group) => group.key)).toEqual(['todo0001', 'done0001', 'unassigned']);
    expect(result.getValue().map((group) => group.label)).toEqual(['todo', 'done', 'Unassigned']);
    expect(result.getValue().map((group) => group.color)).toEqual(['GREEN', null, null]);
    expect(result.getValue()[2]?.rows[0]?.id).toBe('a');
  });

  it('keeps a row in its column after the option is renamed, because the column is the id', () => {
    const renamed: SchemaPropertyDefinition = {
      ...statusProperty,
      options: [
        { color: PAGE_OPTION_COLOR.GREEN, group: null, id: 'todo0001', value: 'pendiente' },
        { color: null, group: null, id: 'done0001', value: 'done' },
      ],
    };

    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'status' },
      [renamed],
      [{ id: 'a', order: 0, propertyValues: { status: 'todo0001' } }],
    );

    expect(result.getValue()[0]?.label).toBe('pendiente');
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('makes a column per status option, in the order of its groups, and none for rows without a value', () => {
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'stage' },
      [stageProperty],
      [{ id: 'a', order: 0, propertyValues: { stage: 'doing001' } }],
    );

    expect(result.getValue().map((group) => group.key)).toEqual(['next0001', 'doing001', 'done0001']);
    expect(result.getValue()[1]?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('orders rows within a group by order then id', () => {
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'status' },
      [statusProperty],
      [
        { id: 'z', order: 0, propertyValues: { status: 'todo0001' } },
        { id: 'y', order: 0, propertyValues: { status: 'todo0001' } },
      ],
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['y', 'z']);
  });

  it('groups the rows of a table that was asked to group', () => {
    const result = groupRowsForView(
      DatabaseViewType.TABLE,
      { groupBy: 'status' },
      [statusProperty],
      [{ id: 'a', order: 0, propertyValues: { status: 'todo0001' } }],
    );

    expect(result.isOk()).toBe(true);
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('rejects a view asked to group by a property that cannot make groups', () => {
    const result = groupRowsForView(DatabaseViewType.TABLE, { groupBy: 'nope' }, [statusProperty], []);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_VIEW_INVALID');
  });

  it('makes a column per day the rows carry when the property declares none', () => {
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'dueDate' },
      [dueDate],
      [
        { id: 'b', order: 1, propertyValues: { dueDate: { start: '2026-09-11' } } },
        { id: 'a', order: 0, propertyValues: { dueDate: { start: '2026-09-10' } } },
        { id: 'c', order: 2, propertyValues: { dueDate: { end: '2026-09-20', start: '2026-09-10' } } },
        { id: 'd', order: 3, propertyValues: {} },
      ],
    );

    expect(result.getValue().map((group) => group.key)).toEqual(['2026-09-10', '2026-09-11', 'unassigned']);
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['a', 'c']);
    expect(result.getValue()[2]?.rows.map((row) => row.id)).toEqual(['d']);
  });

  it('gathers the dates of one week into the monday it started on when the view asks for weeks', () => {
    const result = groupRowsForView(
      DatabaseViewType.TABLE,
      { groupBy: 'dueDate', groupByDateBucket: 'WEEK' },
      [dueDate],
      [
        { id: 'a', order: 0, propertyValues: { dueDate: { start: '2026-09-10' } } },
        { id: 'b', order: 1, propertyValues: { dueDate: { start: '2026-09-11' } } },
        { id: 'c', order: 2, propertyValues: { dueDate: { start: '2026-09-15' } } },
      ],
    );

    expect(result.getValue().map((group) => group.key)).toEqual(['2026-09-07', '2026-09-14', 'unassigned']);
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['a', 'b']);
    expect(result.getValue()[1]?.rows.map((row) => row.id)).toEqual(['c']);
  });

  it('gathers a whole month into one group when the view asks for months', () => {
    const result = groupRowsForView(
      DatabaseViewType.TABLE,
      { groupBy: 'dueDate', groupByDateBucket: 'MONTH' },
      [dueDate],
      [
        { id: 'a', order: 0, propertyValues: { dueDate: { start: '2026-09-10' } } },
        { id: 'b', order: 1, propertyValues: { dueDate: { start: '2026-09-30' } } },
        { id: 'c', order: 2, propertyValues: { dueDate: { start: '2026-10-01' } } },
      ],
    );

    expect(result.getValue().map((group) => group.key)).toEqual(['2026-09', '2026-10', 'unassigned']);
    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('ignores the bucket when the property it groups by is not a date', () => {
    const result = groupRowsForView(
      DatabaseViewType.BOARD,
      { groupBy: 'status', groupByDateBucket: 'MONTH' },
      [statusProperty],
      [{ id: 'a', order: 0, propertyValues: { status: 'todo0001' } }],
    );

    expect(result.getValue()[0]?.rows.map((row) => row.id)).toEqual(['a']);
  });

  it('makes the two columns a checkbox has, even when no row answered yet', () => {
    const done: SchemaPropertyDefinition = {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: 'done',
      label: 'Done',
      options: null,
      required: false,
      type: DatabasePropertyType.CHECKBOX,
    };
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
      [
        {
          config: DEFAULT_PAGE_PROPERTY_CONFIG,
          key: 'title',
          label: 'Title',
          type: DatabasePropertyType.TITLE,
          required: true,
          options: null,
        },
      ],
      [],
    );

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('SCHEMA_VIEW_INVALID');
  });
});
