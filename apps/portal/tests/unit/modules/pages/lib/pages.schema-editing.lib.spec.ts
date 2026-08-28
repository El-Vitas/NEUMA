import { describe, expect, it } from 'bun:test';
import {
  addSchemaOption,
  addSchemaProperty,
  buildPropertyKey,
  removeSchemaOption,
  removeSchemaProperty,
  renameSchemaOption,
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

describe('buildPropertyKey', () => {
  it('turns what somebody typed into a key the schema accepts', () => {
    expect(buildPropertyKey('Fecha de entrega', [])).toBe('fecha_de_entrega');
  });

  it('drops accents and punctuation, because a key is not what the reader sees', () => {
    expect(buildPropertyKey('¿Año?', [])).toBe('ano');
  });

  it('never starts with a digit, since the schema refuses it', () => {
    expect(buildPropertyKey('2024', [])).toBe('p2024');
  });

  it('gives a name already taken a number of its own instead of overwriting it', () => {
    expect(buildPropertyKey('Status', [title, status])).toBe('status_2');
  });

  it('falls back to a readable name when nothing usable was typed', () => {
    expect(buildPropertyKey('«»', [])).toBe('property');
  });
});

describe('toSavableView', () => {
  /**
   * A view written before the server settled what a configuration may hold
   * would take down a change to a property nobody touched.
   */
  it('drops from a configuration what the server would refuse', () => {
    const view: PageSchemaView = {
      configuration: { columns: ['status'], groupBy: 'status' },
      isDefault: true,
      name: 'Board',
      type: 'BOARD',
    };

    expect(toSavableView(view).configuration).toEqual({
      filter: null,
      groupBy: 'status',
      sorts: [],
      visibleProperties: null,
    });
  });

  it('keeps the name, the type and which view is the default', () => {
    const view: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };

    expect(toSavableView(view)).toEqual({
      configuration: { filter: null, groupBy: null, sorts: [], visibleProperties: null },
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

  /** A property that offers no choices keeps no list, so nothing pretends it has one. */
  it('leaves a property that offers no choices without a list of options', () => {
    const properties = addSchemaProperty([title], { label: 'Notes', type: 'RICH_TEXT' });

    expect(properties[1]?.options).toBeNull();
  });
});

describe('removeSchemaProperty', () => {
  it('removes the property somebody pointed at', () => {
    expect(removeSchemaProperty([title, status], 'status').map((property) => property.key)).toEqual(['title']);
  });

  /** The title is what opens the page of each row, so a collection without it has no rows to open. */
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

describe('removeSchemaOption', () => {
  it('removes an option from the shape', () => {
    const properties = removeSchemaOption([title, status], 'status', 'todo');

    expect(properties[1]?.options?.map((option) => option.value)).toEqual(['done']);
  });
});
