import { describe, expect, it } from 'bun:test';
import {
  listGroupablePropertyKeys,
  setViewGroupBy,
  toggleViewProperty,
} from '@/modules/pages/collections/lib/pages.view-editing.lib';
import type { PageSchemaProperty, PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions } from './pages.options.fixture';

const status: PageSchemaProperty = {
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'done'),
  required: false,
  type: 'SELECT',
};
const dueDate: PageSchemaProperty = { key: 'dueDate', label: 'Due date', options: null, required: false, type: 'DATE' };
const title: PageSchemaProperty = { key: 'title', label: 'Title', options: null, required: true, type: 'TITLE' };

const board: PageSchemaView = {
  configuration: { groupBy: 'status' },
  isDefault: true,
  name: 'Board',
  type: 'BOARD',
};
const table: PageSchemaView = { configuration: {}, isDefault: false, name: 'Table', type: 'TABLE' };

describe('listGroupablePropertyKeys', () => {
  /** Only a property with a closed list of values makes columns; a date would make one per day. */
  it('offers only the properties a board can make columns from', () => {
    expect(listGroupablePropertyKeys([title, status, dueDate])).toEqual(['status']);
  });
});

describe('setViewGroupBy', () => {
  it('changes what a board groups by', () => {
    const changed = setViewGroupBy([board, table], 'Board', 'priority');

    expect(changed[0]?.configuration.groupBy).toBe('priority');
  });

  it('leaves the other views alone', () => {
    expect(setViewGroupBy([board, table], 'Board', 'priority')[1]).toEqual(table);
  });

  it('keeps the rest of the configuration', () => {
    const withSorts: PageSchemaView = {
      ...board,
      configuration: { groupBy: 'status', sorts: [{ direction: 'ASCENDING', propertyKey: 'title' }] },
    };

    expect(setViewGroupBy([withSorts], 'Board', 'priority')[0]?.configuration.sorts).toEqual([
      { direction: 'ASCENDING', propertyKey: 'title' },
    ]);
  });
});

describe('toggleViewProperty', () => {
  /** A view that never chose shows everything, so the first thing hidden is the one just clicked. */
  it('hides one property when the view was showing them all', () => {
    const changed = toggleViewProperty([table], 'Table', 'status', ['status', 'dueDate']);

    expect(changed[0]?.configuration.visibleProperties).toEqual(['dueDate']);
  });

  it('shows again a property that was hidden', () => {
    const hidden: PageSchemaView = { ...table, configuration: { visibleProperties: ['dueDate'] } };

    const shownAgain = toggleViewProperty([hidden], 'Table', 'status', ['status', 'dueDate']);

    expect(shownAgain[0]?.configuration.visibleProperties).toEqual(['dueDate', 'status']);
  });

  it('leaves a view nobody named alone', () => {
    expect(toggleViewProperty([table], 'Board', 'status', ['status'])[0]).toEqual(table);
  });
});
