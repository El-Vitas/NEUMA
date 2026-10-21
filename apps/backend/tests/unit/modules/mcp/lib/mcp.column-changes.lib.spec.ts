import { describe, expect, it } from 'bun:test';
import { DEFAULT_PAGE_PROPERTY_CONFIG, PAGE_OPTION_COLOR, type PagePropertyType } from '@neuma/shared';
import {
  applyMcpColumnChanges,
  describeMcpColumnChanges,
  hasMcpColumnChanges,
  hasMcpShapeChanges,
} from '@/modules/mcp/lib/mcp.column-changes.lib';
import { hideMcpNames, listMcpNames } from '@/modules/mcp/lib/mcp.columns.lib';
import type { McpColumn } from '@/modules/mcp/types/mcp.collections.types';

const column = (
  key: string,
  label: string,
  type: PagePropertyType,
  options: readonly string[] | null = null,
): McpColumn => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key,
  label,
  options:
    options?.map((value, index) => ({
      color: PAGE_OPTION_COLOR.GRAY,
      group: null,
      id: `${key}-${String(index)}`,
      value,
    })) ?? null,
  required: type === 'TITLE',
  type,
});

const columns = [column('title', 'Título', 'TITLE'), column('status', 'Estado', 'SELECT', ['Por hacer', 'Hecho'])];

const known = { columns, listNames: listMcpNames };

describe('applyMcpColumnChanges', () => {
  it('adds a column with a key made from its name, and its options with colors', () => {
    const changed = applyMcpColumnChanges(known, {
      addColumns: [{ name: 'Prioridad', options: ['Alta', 'Baja'], type: 'SELECT' }],
    }).getValue();

    const added = changed.properties.at(-1);
    expect(added).toMatchObject({ key: 'prioridad', label: 'Prioridad', required: false, type: 'SELECT' });
    expect(added?.options?.map((option) => option.value)).toEqual(['Alta', 'Baja']);
    expect(added?.options?.every((option) => option.color !== null)).toBe(true);
  });

  it('adds a column of the new kinds with its settings, a status starting on its own options', () => {
    const changed = applyMcpColumnChanges(known, {
      addColumns: [
        { currency: 'CLP', decimals: 0, name: 'Presupuesto', numberFormat: 'CURRENCY', type: 'NUMBER' },
        { name: 'Código', prefix: 'TSK', type: 'UNIQUE_ID' },
        { name: 'Responsables', multiple: true, type: 'PERSON' },
        { name: 'Etapa', options: ['ignored'], type: 'STATUS' },
      ],
    }).getValue();

    const [, , budget, code, owners, stage] = changed.properties;
    expect(budget?.config).toMatchObject({ currency: 'CLP', decimals: 0, numberFormat: 'CURRENCY' });
    expect(code?.config.prefix).toBe('TSK');
    expect(owners?.config.allowsMultiple).toBe(true);
    expect(stage?.options).toBeNull();
  });

  it('puts an option added to a status in the group of what has not begun', () => {
    const withStage = [...columns, column('stage', 'Etapa', 'STATUS')];

    const changed = applyMcpColumnChanges(
      { columns: withStage, listNames: listMcpNames },
      { addOptions: [{ column: 'Etapa', options: ['Bloqueado'] }] },
    ).getValue();

    expect(changed.properties[2]?.options?.[0]).toMatchObject({ group: 'TO_DO', id: null, value: 'Bloqueado' });
  });

  it('renames a column by its name and keeps its key, so the rows keep their values', () => {
    const changed = applyMcpColumnChanges(known, { renameColumns: [{ column: 'estado', name: 'Etapa' }] }).getValue();

    expect(changed.properties[1]).toMatchObject({ key: 'status', label: 'Etapa' });
  });

  it('removes a column, but never the title', () => {
    expect(applyMcpColumnChanges(known, { removeColumns: ['Estado'] }).getValue().properties).toHaveLength(1);
    expect(applyMcpColumnChanges(known, { removeColumns: ['Título'] }).getError()).toContain('title');
  });

  it('adds options to a column that has them, leaving the ones it had', () => {
    const changed = applyMcpColumnChanges(known, {
      addOptions: [{ column: 'Estado', options: ['En curso'] }],
    }).getValue();

    expect(changed.properties[1]?.options?.map((option) => option.value)).toEqual(['Por hacer', 'Hecho', 'En curso']);
  });

  it('refuses an option the column already has', () => {
    expect(
      applyMcpColumnChanges(known, { addOptions: [{ column: 'Estado', options: ['hecho'] }] }).getError(),
    ).toContain('Hecho');
  });

  it('hands renaming and removing options over as rewrites, and returns the shape they leave', () => {
    const changed = applyMcpColumnChanges(known, {
      removeOptions: [{ column: 'Estado', option: 'hecho' }],
      renameOptions: [{ column: 'status', from: 'por hacer', to: 'Pendiente' }],
    }).getValue();

    expect(changed.optionRewrites).toEqual([
      { from: 'Por hacer', optionId: 'status-0', propertyKey: 'status', to: 'Pendiente' },
      { from: 'Hecho', optionId: 'status-1', propertyKey: 'status', to: null },
    ]);
    expect(changed.properties[1]?.options?.map((option) => option.value)).toEqual(['Pendiente']);
  });

  it('refuses, before any row is rewritten, an option added under the name another one is renamed to', () => {
    expect(
      applyMcpColumnChanges(known, {
        addOptions: [{ column: 'Estado', options: ['Pendiente'] }],
        renameOptions: [{ column: 'Estado', from: 'Por hacer', to: 'Pendiente' }],
      }).getError(),
    ).toContain('Pendiente');
  });

  it('refuses renaming an option to the name of another option of the same column', () => {
    expect(
      applyMcpColumnChanges(known, {
        renameOptions: [{ column: 'Estado', from: 'Por hacer', to: 'hecho' }],
      }).getError(),
    ).toContain('Hecho');
  });

  it('refuses rewriting the options of a column that the same request removes', () => {
    expect(
      applyMcpColumnChanges(known, {
        removeColumns: ['Estado'],
        removeOptions: [{ column: 'Estado', option: 'Hecho' }],
      }).getError(),
    ).toContain('Estado');
  });

  it('refuses a column or an option that is not there, saying what there is', () => {
    expect(applyMcpColumnChanges(known, { renameColumns: [{ column: 'Nada', name: 'X' }] }).getError()).toContain(
      'Estado (status)',
    );
    expect(
      applyMcpColumnChanges(known, { removeOptions: [{ column: 'Estado', option: 'Nunca' }] }).getError(),
    ).toContain('Por hacer, Hecho');
  });

  it('refuses without naming what there is when the names are kept from the agent', () => {
    const hidden = { columns, listNames: hideMcpNames };

    const missingColumn = applyMcpColumnChanges(hidden, { renameColumns: [{ column: 'Nada', name: 'X' }] });
    const missingOption = applyMcpColumnChanges(hidden, { removeOptions: [{ column: 'Estado', option: 'Nunca' }] });
    const takenOption = applyMcpColumnChanges(hidden, { addOptions: [{ column: 'Estado', options: ['hecho'] }] });

    expect(missingColumn.getError()).toBe('The collection has no column "Nada".');
    expect(missingOption.getError()).not.toContain('Por hacer');
    expect(takenOption.getError()).not.toContain('Por hacer');
  });
});

describe('what a request for column changes asks', () => {
  it('asks nothing when every list is missing or empty', () => {
    expect(hasMcpColumnChanges({ addColumns: [], removeColumns: [] })).toBe(false);
    expect(hasMcpColumnChanges({ removeColumns: ['Estado'] })).toBe(true);
  });

  it('changes the shape only when it adds, renames or removes columns, or adds options', () => {
    expect(hasMcpShapeChanges({ renameOptions: [{ column: 'Estado', from: 'Hecho', to: 'Listo' }] })).toBe(false);
    expect(hasMcpShapeChanges({ addOptions: [{ column: 'Estado', options: ['Bloqueado'] }] })).toBe(true);
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
