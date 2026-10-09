import { describe, expect, it } from 'bun:test';
import { addMcpView, changeMcpView, removeMcpView } from '@/modules/mcp/lib/mcp.views.lib';
import type { McpView } from '@/modules/mcp/types/mcp.collections.types';

const table: McpView = { configuration: {}, isDefault: true, name: 'Tabla', type: 'TABLE' };
const board: McpView = { configuration: { groupBy: 'status' }, isDefault: false, name: 'Tablero', type: 'BOARD' };

describe('addMcpView', () => {
  it('adds the view after the others, leaving the default where it was', () => {
    const views = addMcpView([table], { ...board, isDefault: false }, false).getValue();

    expect(views.map((view) => [view.name, view.isDefault])).toEqual([
      ['Tabla', true],
      ['Tablero', false],
    ]);
  });

  it('makes it the default when asked, and takes the lead from the one that had it', () => {
    const views = addMcpView([table], board, true).getValue();

    expect(views.map((view) => view.isDefault)).toEqual([false, true]);
  });

  it('refuses a name another view has, however it is written', () => {
    expect(addMcpView([table, board], { ...board, name: 'tablero' }, false).getError()).toContain('Tablero');
  });
});

describe('changeMcpView', () => {
  it('renames a view and keeps what it shows unless told otherwise', () => {
    const views = changeMcpView([table, board], board, {
      configuration: board.configuration,
      name: 'Kanban',
    }).getValue();

    expect(views[1]).toEqual({ ...board, name: 'Kanban' });
  });

  it('refuses to take the name of another view', () => {
    expect(changeMcpView([table, board], board, { configuration: {}, name: 'TABLA' }).getError()).toContain('Tabla');
  });

  it('makes it the default when asked', () => {
    const views = changeMcpView([table, board], board, { configuration: {}, makeDefault: true }).getValue();

    expect(views.map((view) => view.isDefault)).toEqual([false, true]);
  });
});

describe('removeMcpView', () => {
  it('removes the view and hands the lead to another when it had it', () => {
    expect(removeMcpView([table, board], table).getValue()).toEqual([{ ...board, isDefault: true }]);
  });

  it('refuses to remove the only view, saying why', () => {
    expect(removeMcpView([table], table).getError()).toContain('only view');
  });
});
