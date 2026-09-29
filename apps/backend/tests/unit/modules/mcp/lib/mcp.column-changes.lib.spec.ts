import { describe, expect, it } from 'bun:test';
import { PAGE_OPTION_COLOR, type PagePropertyType } from '@company-brain/shared';
import {
  applyMcpColumnChanges,
  describeMcpColumnChanges,
  hasMcpColumnChanges,
  hasMcpShapeChanges,
  withoutMcpOptionRewrites,
} from '@/modules/mcp/lib/mcp.column-changes.lib';
import type { McpColumn } from '@/modules/mcp/types/mcp.collections.types';

const column = (
  key: string,
  label: string,
  type: PagePropertyType,
  options: readonly string[] | null = null,
): McpColumn => ({
  key,
  label,
  options: options?.map((value) => ({ color: PAGE_OPTION_COLOR.GRAY, value })) ?? null,
  required: type === 'TITLE',
  type,
});

const columns = [column('title', 'Título', 'TITLE'), column('status', 'Estado', 'SELECT', ['Por hacer', 'Hecho'])];

describe('applyMcpColumnChanges', () => {
  it('adds a column with a key made from its name, and its options with colors', () => {
    const changed = applyMcpColumnChanges(columns, {
      addColumns: [{ name: 'Prioridad', options: ['Alta', 'Baja'], type: 'SELECT' }],
    }).getValue();

    const added = changed.properties.at(-1);
    expect(added).toMatchObject({ key: 'prioridad', label: 'Prioridad', required: false, type: 'SELECT' });
    expect(added?.options?.map((option) => option.value)).toEqual(['Alta', 'Baja']);
    expect(added?.options?.every((option) => option.color !== null)).toBe(true);
  });

  it('renames a column by its name and keeps its key, so the rows keep their values', () => {
    const changed = applyMcpColumnChanges(columns, { renameColumns: [{ column: 'estado', name: 'Etapa' }] }).getValue();

    expect(changed.properties[1]).toMatchObject({ key: 'status', label: 'Etapa' });
  });

  it('removes a column, but never the title', () => {
    expect(applyMcpColumnChanges(columns, { removeColumns: ['Estado'] }).getValue().properties).toHaveLength(1);
    expect(applyMcpColumnChanges(columns, { removeColumns: ['Título'] }).getError()).toContain('title');
  });

  it('adds options to a column that has them, leaving the ones it had', () => {
    const changed = applyMcpColumnChanges(columns, {
      addOptions: [{ column: 'Estado', options: ['En curso'] }],
    }).getValue();

    expect(changed.properties[1]?.options?.map((option) => option.value)).toEqual(['Por hacer', 'Hecho', 'En curso']);
  });

  it('refuses an option the column already has', () => {
    expect(
      applyMcpColumnChanges(columns, { addOptions: [{ column: 'Estado', options: ['hecho'] }] }).getError(),
    ).toContain('Hecho');
  });

  /** Renombrar o quitar una opción reescribe las filas que la tenían, y eso lo hace otro camino. */
  it('hands renaming and removing options over as rewrites, by the option as it is written', () => {
    const changed = applyMcpColumnChanges(columns, {
      removeOptions: [{ column: 'Estado', option: 'hecho' }],
      renameOptions: [{ column: 'status', from: 'por hacer', to: 'Pendiente' }],
    }).getValue();

    expect(changed.optionRewrites).toEqual([
      { from: 'Por hacer', propertyKey: 'status', to: 'Pendiente' },
      { from: 'Hecho', propertyKey: 'status', to: null },
    ]);
    expect(changed.properties).toEqual(columns);
  });

  it('refuses a column or an option that is not there, saying what there is', () => {
    expect(applyMcpColumnChanges(columns, { renameColumns: [{ column: 'Nada', name: 'X' }] }).getError()).toContain(
      'Estado (status)',
    );
    expect(
      applyMcpColumnChanges(columns, { removeOptions: [{ column: 'Estado', option: 'Nunca' }] }).getError(),
    ).toContain('Por hacer, Hecho');
  });
});

describe('what a request for column changes asks', () => {
  it('asks nothing when every list is missing or empty', () => {
    expect(hasMcpColumnChanges({ addColumns: [], removeColumns: [] })).toBe(false);
    expect(hasMcpColumnChanges({ removeColumns: ['Estado'] })).toBe(true);
  });

  /** Renombrar o quitar opciones va por otro camino; lo demás cambia la forma guardada. */
  it('changes the shape only when it adds, renames or removes columns, or adds options', () => {
    expect(hasMcpShapeChanges({ renameOptions: [{ column: 'Estado', from: 'Hecho', to: 'Listo' }] })).toBe(false);
    expect(hasMcpShapeChanges({ addOptions: [{ column: 'Estado', options: ['Bloqueado'] }] })).toBe(true);
  });

  it('leaves out the option rewrites, keeping everything else', () => {
    const changes = {
      removeColumns: ['Estado'],
      removeOptions: [{ column: 'Estado', option: 'Hecho' }],
      renameOptions: [{ column: 'Estado', from: 'Hecho', to: 'Listo' }],
    };

    expect(withoutMcpOptionRewrites(changes)).toEqual({ removeColumns: ['Estado'] });
  });

  it('sums the changes up in a line each, to record what the agent asked', () => {
    expect(
      describeMcpColumnChanges({
        addColumns: [{ name: 'Prioridad', type: 'SELECT' }],
        renameOptions: [{ column: 'Estado', from: 'Hecho', to: 'Listo' }],
      }),
    ).toEqual({ changes: ['add column Prioridad', 'rename option Estado: Hecho → Listo'] });
  });
});
