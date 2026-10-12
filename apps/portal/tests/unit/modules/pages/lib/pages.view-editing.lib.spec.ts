import { describe, expect, it } from 'bun:test';
import {
  findBoardWithoutGrouping,
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
  it('offers only the properties a board can make columns from', () => {
    expect(listGroupablePropertyKeys([title, status, dueDate])).toEqual(['status', 'dueDate']);
  });
});

describe('findBoardWithoutGrouping', () => {
  it('finds the board that does not say what makes its columns', () => {
    const ungrouped: PageSchemaView = { configuration: {}, isDefault: false, name: 'Nuevo', type: 'BOARD' };

    expect(findBoardWithoutGrouping([table, ungrouped], [title, status])?.name).toBe('Nuevo');
  });

  it('finds nothing when every board says what makes its columns', () => {
    expect(findBoardWithoutGrouping([table, board], [title, status])).toBeUndefined();
  });

  it('says nothing about a board grouped by a date', () => {
    const byDate: PageSchemaView = {
      configuration: { groupBy: 'dueDate' },
      isDefault: false,
      name: 'Plazos',
      type: 'BOARD',
    };

    expect(findBoardWithoutGrouping([byDate], [title, dueDate])).toBeUndefined();
  });

  it('counts as ungrouped a board pointing at a property that cannot make columns', () => {
    const byTitle: PageSchemaView = {
      configuration: { groupBy: 'title' },
      isDefault: false,
      name: 'Por nombre',
      type: 'BOARD',
    };

    expect(findBoardWithoutGrouping([byTitle], [title, status])?.name).toBe('Por nombre');
  });

  it('counts as ungrouped a board pointing at a property that is no longer there', () => {
    expect(findBoardWithoutGrouping([board], [title])?.name).toBe('Board');
  });

  it('says nothing about a table, which makes no columns', () => {
    expect(findBoardWithoutGrouping([table], [title])).toBeUndefined();
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
