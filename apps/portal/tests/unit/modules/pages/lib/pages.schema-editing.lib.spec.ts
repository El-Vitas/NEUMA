import { describe, expect, it } from 'bun:test';
import { EMPTY_PAGE_VIEW_CONFIGURATION, readPageViewConfiguration } from '@neuma/shared';
import {
  addSchemaOption,
  addSchemaProperty,
  addSchemaView,
  changeSchemaPropertyType,
  convertSchemaView,
  duplicateSchemaView,
  listWhatConvertingDrops,
  moveSchemaOption,
  moveSchemaProperty,
  moveSchemaView,
  removeSchemaOption,
  removeSchemaProperty,
  renameSchemaOption,
  renameSchemaView,
  toSavableView,
  updateSchemaOptionColor,
  updateSchemaProperty,
} from '@/modules/pages/collections/lib/pages.schema-editing.lib';
import type { PageSchemaProperty, PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions } from './pages.options.fixture';

const title: PageSchemaProperty = { key: 'title', label: 'Title', options: null, required: true, type: 'TITLE' };
const status: PageSchemaProperty = {
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'done'),
  required: false,
  type: 'SELECT',
};

describe('toSavableView', () => {
  // A view saved before the server fixed what a configuration may hold must not block changes to other properties.
  it('drops from a configuration what the server would refuse', () => {
    const view: PageSchemaView = {
      configuration: { columns: ['status'], groupBy: 'status' },
      isDefault: true,
      name: 'Board',
      type: 'BOARD',
    };

    expect(toSavableView(view).configuration).toEqual({ ...EMPTY_PAGE_VIEW_CONFIGURATION, groupBy: 'status' });
  });

  it('keeps the name, the type and which view is the default', () => {
    const view: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };

    expect(toSavableView(view)).toEqual({
      configuration: { ...EMPTY_PAGE_VIEW_CONFIGURATION },
      isDefault: true,
      name: 'Table',
      type: 'TABLE',
    });
  });
});

describe('addSchemaProperty', () => {
  it('adds a property at the end, leaving the ones already there untouched', () => {
    const properties = addSchemaProperty([title, status], { label: 'Team', type: 'MULTI_SELECT' });

    expect(properties.map((property) => property.key)).toEqual(['title', 'status', 'team']);
    expect(properties[2]).toEqual({
      key: 'team',
      label: 'Team',
      options: [],
      required: false,
      type: 'MULTI_SELECT',
    });
  });

  it('leaves a property that offers no choices without a list of options', () => {
    const properties = addSchemaProperty([title], { label: 'Notes', type: 'RICH_TEXT' });

    expect(properties[1]?.options).toBeNull();
  });
});

describe('removeSchemaProperty', () => {
  it('removes the property somebody pointed at', () => {
    expect(removeSchemaProperty([title, status], 'status').map((property) => property.key)).toEqual(['title']);
  });

  it('refuses to remove the title, whatever it is called', () => {
    expect(removeSchemaProperty([title, status], 'title')).toEqual([title, status]);
  });
});

describe('updateSchemaProperty', () => {
  it('renames a property without touching the key its rows are stored under', () => {
    const properties = updateSchemaProperty([title, status], 'status', { label: 'Estado' });

    expect(properties[1]).toEqual({ ...status, label: 'Estado' });
  });

  it('leaves alone a property nobody named', () => {
    expect(updateSchemaProperty([title, status], 'nowhere', { label: 'Estado' })).toEqual([title, status]);
  });
});

describe('addSchemaView', () => {
  const table: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };
  const notes: PageSchemaProperty = { key: 'notes', label: 'Notes', options: null, required: false, type: 'RICH_TEXT' };

  it('adds a view at the end, without touching the one that was already there', () => {
    const views = addSchemaView([table], { name: 'Second', type: 'TABLE' }, [title, status]);

    expect(views.map((view) => view.name)).toEqual(['Table', 'Second']);
    expect(views[1]).toEqual({ configuration: {}, isDefault: false, name: 'Second', type: 'TABLE' });
  });

  it('makes a board group by the first property that can make columns', () => {
    const views = addSchemaView([table], { name: 'Board', type: 'BOARD' }, [title, status]);

    expect(views[1]?.configuration).toEqual({ groupBy: 'status' });
  });

  it('leaves a board ungrouped when nothing in the collection can make columns', () => {
    expect(addSchemaView([table], { name: 'Board', type: 'BOARD' }, [title, notes])[1]?.configuration).toEqual({});
  });

  it('says nothing about grouping on a view that makes no columns', () => {
    expect(addSchemaView([table], { name: 'Second', type: 'TABLE' }, [title, status])[1]?.configuration).toEqual({});
  });

  it('does not make the new view the one the collection leads with', () => {
    expect(addSchemaView([table], { name: 'Board', type: 'BOARD' }, [title, status])[0]?.isDefault).toBe(true);
  });

  it('refuses a name another view already has, because the address nombra la vista por su nombre', () => {
    expect(addSchemaView([table], { name: 'Table', type: 'BOARD' }, [title, status])).toEqual([table]);
  });

  it('refuses a view with no name', () => {
    expect(addSchemaView([table], { name: '   ', type: 'BOARD' }, [title, status])).toEqual([table]);
  });

  it('trims the name, so two views do not differ by a space nobody sees', () => {
    expect(addSchemaView([table], { name: '  Board  ', type: 'BOARD' }, [title, status])[1]?.name).toBe('Board');
  });
});

describe('renameSchemaView', () => {
  const table: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };
  const board: PageSchemaView = { configuration: {}, isDefault: false, name: 'Board', type: 'BOARD' };

  it('renames a view without touching what it was set to show', () => {
    expect(renameSchemaView([table, board], 'Board', 'Tablero')[1]).toEqual({ ...board, name: 'Tablero' });
  });

  it('refuses a name another view already has', () => {
    expect(renameSchemaView([table, board], 'Board', 'Table')).toEqual([table, board]);
  });

  it('refuses to leave a view with no name', () => {
    expect(renameSchemaView([table, board], 'Board', '  ')).toEqual([table, board]);
  });
});

describe('moveSchemaView', () => {
  const table: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };
  const board: PageSchemaView = { configuration: {}, isDefault: false, name: 'Board', type: 'BOARD' };
  const calendar: PageSchemaView = { configuration: {}, isDefault: false, name: 'Calendar', type: 'TABLE' };

  it('moves a view one place earlier', () => {
    expect(moveSchemaView([table, board, calendar], 'Board', 'EARLIER').map((view) => view.name)).toEqual([
      'Board',
      'Table',
      'Calendar',
    ]);
  });

  it('moves a view one place later', () => {
    expect(moveSchemaView([table, board, calendar], 'Board', 'LATER').map((view) => view.name)).toEqual([
      'Table',
      'Calendar',
      'Board',
    ]);
  });

  it('does nothing to the first view asked to go earlier', () => {
    expect(moveSchemaView([table, board], 'Table', 'EARLIER')).toEqual([table, board]);
  });

  it('does nothing to the last view asked to go later', () => {
    expect(moveSchemaView([table, board], 'Board', 'LATER')).toEqual([table, board]);
  });

  it('does not change which view the collection opens with', () => {
    expect(moveSchemaView([table, board], 'Board', 'EARLIER').find((view) => view.isDefault)?.name).toBe('Table');
  });

  it('leaves alone a view nobody named', () => {
    expect(moveSchemaView([table, board], 'Calendar', 'EARLIER')).toEqual([table, board]);
  });
});

describe('moveSchemaProperty', () => {
  const due: PageSchemaProperty = { key: 'due', label: 'Due', options: null, required: false, type: 'DATE' };

  it('moves a property one place earlier', () => {
    expect(moveSchemaProperty([title, status, due], 'due', 'EARLIER').map((property) => property.key)).toEqual([
      'title',
      'due',
      'status',
    ]);
  });

  it('moves a property one place later', () => {
    expect(moveSchemaProperty([title, status, due], 'status', 'LATER').map((property) => property.key)).toEqual([
      'title',
      'due',
      'status',
    ]);
  });

  it('leaves the title where it is', () => {
    expect(moveSchemaProperty([title, status], 'title', 'LATER')).toEqual([title, status]);
  });

  it('never pushes a property past the title', () => {
    expect(moveSchemaProperty([title, status], 'status', 'EARLIER')).toEqual([title, status]);
  });

  it('does nothing to the last property asked to go later', () => {
    expect(moveSchemaProperty([title, status], 'status', 'LATER')).toEqual([title, status]);
  });
});

describe('duplicateSchemaView', () => {
  const table: PageSchemaView = {
    configuration: { groupBy: 'status', sorts: [{ direction: 'ASCENDING', propertyKey: 'status' }] },
    isDefault: true,
    name: 'Table',
    type: 'TABLE',
  };
  const board: PageSchemaView = { configuration: {}, isDefault: false, name: 'Board', type: 'BOARD' };

  it('leaves the copy right next to the one it came from', () => {
    expect(duplicateSchemaView([table, board], 'Table').map((view) => view.name)).toEqual([
      'Table',
      'Table (2)',
      'Board',
    ]);
  });

  it('copies everything the view said about itself', () => {
    const copy = duplicateSchemaView([table, board], 'Table')[1];

    expect(copy?.configuration).toEqual(table.configuration);
    expect(copy?.type).toBe('TABLE');
  });

  it('never takes over as the view the collection opens with', () => {
    expect(duplicateSchemaView([table, board], 'Table')[1]?.isDefault).toBe(false);
  });

  it('keeps looking for a free name when the obvious one is taken', () => {
    const taken: PageSchemaView = { configuration: {}, isDefault: false, name: 'Table (2)', type: 'TABLE' };

    expect(duplicateSchemaView([table, taken], 'Table').map((view) => view.name)).toEqual([
      'Table',
      'Table (3)',
      'Table (2)',
    ]);
  });

  it('leaves alone a view nobody named', () => {
    expect(duplicateSchemaView([table, board], 'Calendar')).toEqual([table, board]);
  });
});

describe('convertSchemaView', () => {
  const board: PageSchemaView = {
    configuration: { columnWidths: { title: 320 }, groupBy: 'status', subGroupBy: 'priority' },
    isDefault: false,
    name: 'Board',
    type: 'BOARD',
  };

  it('changes what the view is without touching what it reads', () => {
    const converted = convertSchemaView([board], 'Board', 'TABLE', [title, status])[0];

    expect(converted?.type).toBe('TABLE');
    expect(readPageViewConfiguration(converted?.configuration).groupBy).toBe('status');
  });

  it('drops the bands when what it becomes cannot draw them', () => {
    const converted = convertSchemaView([board], 'Board', 'TABLE', [title, status])[0];

    expect(readPageViewConfiguration(converted?.configuration).subGroupBy).toBeNull();
  });

  it('keeps what the new kind of view simply ignores', () => {
    const converted = convertSchemaView([board], 'Board', 'TABLE', [title, status])[0];

    expect(readPageViewConfiguration(converted?.configuration).columnWidths).toEqual({ title: 320 });
  });

  it('gives a grouping to what cannot be drawn without one', () => {
    const table: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };
    const converted = convertSchemaView([table], 'Table', 'BOARD', [title, status])[0];

    expect(readPageViewConfiguration(converted?.configuration).groupBy).toBe('status');
  });

  it('leaves the view alone when it already is what it was asked to become', () => {
    expect(convertSchemaView([board], 'Board', 'BOARD', [title, status])).toEqual([board]);
  });
});

describe('listWhatConvertingDrops', () => {
  const board: PageSchemaView = {
    configuration: { groupBy: 'status', subGroupBy: 'priority' },
    isDefault: false,
    name: 'Board',
    type: 'BOARD',
  };

  it('says the bands go when what it becomes cannot draw them', () => {
    expect(listWhatConvertingDrops(board, 'TABLE')).toEqual(['BANDS']);
  });

  it('says nothing goes when nothing does', () => {
    expect(listWhatConvertingDrops({ ...board, configuration: { groupBy: 'status' } }, 'TABLE')).toEqual([]);
  });
});

describe('changeSchemaPropertyType', () => {
  it('changes the type without touching the key its rows are stored under', () => {
    const properties = changeSchemaPropertyType([title, status], 'status', 'RICH_TEXT');

    expect(properties[1]).toEqual({ ...status, options: null, type: 'RICH_TEXT' });
  });

  it('keeps the choices when both the old type and the new one are chosen from a list', () => {
    const properties = changeSchemaPropertyType([title, status], 'status', 'MULTI_SELECT');

    expect(properties[1]).toEqual({ ...status, type: 'MULTI_SELECT' });
  });

  it('starts an empty list when the new type needs one and the old had none', () => {
    const notes: PageSchemaProperty = {
      key: 'notes',
      label: 'Notes',
      options: null,
      required: false,
      type: 'RICH_TEXT',
    };
    const properties = changeSchemaPropertyType([title, notes], 'notes', 'SELECT');

    expect(properties[1]).toEqual({ ...notes, options: [], type: 'SELECT' });
  });

  it('refuses to change the type of the property that names each row', () => {
    expect(changeSchemaPropertyType([title, status], 'title', 'NUMBER')).toEqual([title, status]);
  });

  it('refuses to turn another property into a second title', () => {
    expect(changeSchemaPropertyType([title, status], 'status', 'TITLE')).toEqual([title, status]);
  });

  it('leaves alone a property nobody named', () => {
    expect(changeSchemaPropertyType([title, status], 'nowhere', 'NUMBER')).toEqual([title, status]);
  });
});

describe('addSchemaOption', () => {
  it('adds an option with a color of its own, so a board reads at a glance', () => {
    const properties = addSchemaOption([title, status], 'status', 'blocked');

    expect(properties[1]?.options?.map((option) => option.value)).toEqual(['todo', 'done', 'blocked']);
    expect(properties[1]?.options?.[2]?.color).not.toBeNull();
  });

  it('refuses an option that is already there rather than showing it twice', () => {
    expect(addSchemaOption([title, status], 'status', 'done')).toEqual([title, status]);
  });

  it('refuses an option with no name', () => {
    expect(addSchemaOption([title, status], 'status', '   ')).toEqual([title, status]);
  });
});

describe('renameSchemaOption', () => {
  it('renames an option in the shape', () => {
    const properties = renameSchemaOption([title, status], 'status', 'todo', 'por hacer');

    expect(properties[1]?.options?.map((option) => option.value)).toEqual(['por hacer', 'done']);
  });

  it('refuses to rename onto a name another option already has', () => {
    expect(renameSchemaOption([title, status], 'status', 'todo', 'done')).toEqual([title, status]);
  });
});

describe('updateSchemaOptionColor', () => {
  it('gives an option another color, keeping its place and its name', () => {
    const properties = updateSchemaOptionColor([title, status], 'status', 'done', 'RED');

    expect(properties[1]?.options).toEqual([
      { color: null, value: 'todo' },
      { color: 'RED', value: 'done' },
    ]);
  });
});

describe('moveSchemaOption', () => {
  const optionsOf = (properties: readonly PageSchemaProperty[]) => properties[1]?.options?.map((one) => one.value);

  it('puts the option right before the one it was dropped on', () => {
    expect(optionsOf(moveSchemaOption([title, status], 'status', 'done', 'todo'))).toEqual(['done', 'todo']);
  });

  it('puts it last when it was dropped after everything', () => {
    expect(optionsOf(moveSchemaOption([title, status], 'status', 'todo', null))).toEqual(['done', 'todo']);
  });

  it('leaves the shape alone when it lands where it already was', () => {
    expect(moveSchemaOption([title, status], 'status', 'todo', 'todo')).toEqual([title, status]);
  });

  it('leaves the shape alone when either end is not there', () => {
    expect(moveSchemaOption([title, status], 'status', 'nope', 'todo')).toEqual([title, status]);
    expect(moveSchemaOption([title, status], 'status', 'todo', 'nope')).toEqual([title, status]);
  });
});

describe('removeSchemaOption', () => {
  it('removes an option from the shape', () => {
    const properties = removeSchemaOption([title, status], 'status', 'todo');

    expect(properties[1]?.options?.map((option) => option.value)).toEqual(['done']);
  });
});
