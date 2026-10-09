import { describe, expect, test } from 'bun:test';
import { makeSchemaViewDefault, removeSchemaView } from './page-view.editing.lib.js';

const table = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };
const board = { configuration: {}, isDefault: false, name: 'Board', type: 'BOARD' };

describe('removeSchemaView', () => {
  test('removes the view somebody pointed at', () => {
    expect(removeSchemaView([table, board], 'Board').map((view) => view.name)).toEqual(['Table']);
  });

  /** Sin ninguna vista no hay forma de mirar las filas, y el servidor tampoco lo acepta. */
  test('refuses to remove the last view', () => {
    expect(removeSchemaView([table], 'Table')).toEqual([table]);
  });

  test('hands the lead to another view when the one removed was leading', () => {
    const views = removeSchemaView([table, board], 'Table');

    expect(views).toEqual([{ ...board, isDefault: true }]);
  });

  test('leaves alone a view nobody named', () => {
    expect(removeSchemaView([table, board], 'Calendar')).toEqual([table, board]);
  });
});

describe('makeSchemaViewDefault', () => {
  /** Abrir la colección lleva a una vista, así que exactamente una la lleva. */
  test('hands the lead to the view named, and takes it from the one that had it', () => {
    expect(makeSchemaViewDefault([table, board], 'Board').map((view) => view.isDefault)).toEqual([false, true]);
  });

  test('leaves alone a view nobody named', () => {
    expect(makeSchemaViewDefault([table, board], 'Calendar')).toEqual([table, board]);
  });
});
