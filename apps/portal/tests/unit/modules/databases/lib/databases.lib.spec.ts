import { describe, expect, it } from 'bun:test';
import { formatPropertyValue, groupRecordsBySelectProperty } from '@/modules/databases/lib/databases.lib';
import type { DatabaseProperty, DatabaseRecord } from '@/modules/databases/types/databases.types';

const statusProperty: DatabaseProperty = {
  key: 'status',
  label: 'Status',
  options: ['todo', 'done'],
  required: true,
  type: 'SELECT',
};

const record = (id: string, status?: string): DatabaseRecord => ({
  databaseId: 'database-1',
  id,
  lifecycle: 'ACTIVE',
  order: Number(id),
  propertyValues: status === undefined ? {} : { status },
  title: `Record ${id}`,
});

describe('databases.lib', () => {
  it('groups records by select options and keeps unassigned records explicit', () => {
    const columns = groupRecordsBySelectProperty(
      [record('2', 'done'), record('1'), record('3', 'todo')],
      statusProperty,
    );

    expect(columns.map((column) => column.key)).toEqual(['todo', 'done', 'unassigned']);
    expect(columns.map((column) => column.records.map((item) => item.id))).toEqual([['3'], ['2'], ['1']]);
  });

  it('returns no board columns when the grouping property is not a select', () => {
    expect(
      groupRecordsBySelectProperty([record('1', 'done')], { ...statusProperty, type: 'RICH_TEXT', options: null }),
    ).toEqual([]);
  });

  it('uses caller-provided labels for formatted property values', () => {
    const labels = { empty: 'No value', no: 'No', yes: 'Yes' };

    expect(formatPropertyValue(undefined, labels)).toBe('No value');
    expect(formatPropertyValue(false, labels)).toBe('No');
    expect(formatPropertyValue(true, labels)).toBe('Yes');
  });
});
