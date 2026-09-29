import { describe, expect, it } from 'bun:test';
import type { PagePropertyType } from '@company-brain/shared';
import { normalizeMcpCellValues, resolveMcpColumn } from '@/modules/mcp/lib/mcp.columns.lib';
import type { McpColumn } from '@/modules/mcp/types/mcp.collections.types';

const column = (
  key: string,
  label: string,
  type: PagePropertyType,
  options: readonly string[] | null = null,
): McpColumn => ({
  key,
  label,
  options: options?.map((value) => ({ color: null, value })) ?? null,
  required: false,
  type,
});

const columns = [
  column('title', 'Título', 'TITLE'),
  column('status', 'Estado', 'SELECT', ['Por hacer', 'En curso', 'Hecho']),
  column('tags', 'Etiquetas', 'MULTI_SELECT', ['Urgente', 'Cliente']),
  column('owner', 'Responsable', 'PERSON'),
  column('due', 'Vence', 'DATE'),
  column('hours', 'Horas', 'NUMBER'),
  column('done', 'Listo', 'CHECKBOX'),
];

const people = [
  { id: 'u-1', name: 'Ana Pérez' },
  { id: 'u-2', name: 'Luis Soto' },
];

describe('resolveMcpColumn', () => {
  it('finds a column by its key, or by the name people see, however it is written', () => {
    expect(resolveMcpColumn(columns, 'status')?.key).toBe('status');
    expect(resolveMcpColumn(columns, 'estado')?.key).toBe('status');
    expect(resolveMcpColumn(columns, 'TITULO')?.key).toBe('title');
  });

  it('finds nothing for a column the collection does not have', () => {
    expect(resolveMcpColumn(columns, 'Prioridad')).toBeNull();
  });
});

describe('normalizeMcpCellValues', () => {
  it('turns names into what the collection stores: the option as it is written, the person by their id', () => {
    const normalized = normalizeMcpCellValues(
      columns,
      {
        Estado: 'en curso',
        Etiquetas: ['urgente'],
        Responsable: 'ana pérez',
        due: '2026-10-01',
        Horas: 8,
        Listo: true,
      },
      people,
    );

    expect(normalized.getValue()).toEqual({
      done: true,
      due: '2026-10-01',
      hours: 8,
      owner: 'u-1',
      status: 'En curso',
      tags: ['Urgente'],
    });
  });

  it('takes a person by their id too, and null to empty a cell', () => {
    expect(normalizeMcpCellValues(columns, { owner: 'u-2', status: null }, people).getValue()).toEqual({
      owner: 'u-2',
      status: null,
    });
  });

  /** Guardar a medias un valor que no existe deja la fila en un estado que nadie pidió. */
  it('refuses an option the column does not have, and says which ones it has', () => {
    const refused = normalizeMcpCellValues(columns, { Estado: 'Bloqueado' }, people);

    expect(refused.isFail()).toBe(true);
    expect(refused.getError()).toContain('Bloqueado');
    expect(refused.getError()).toContain('Por hacer, En curso, Hecho');
  });

  it('refuses a column the collection does not have, and says which ones it has', () => {
    const refused = normalizeMcpCellValues(columns, { Prioridad: 'Alta' }, people);

    expect(refused.getError()).toContain('Prioridad');
    expect(refused.getError()).toContain('Estado (status)');
  });

  it('refuses a person who is not in the workspace', () => {
    expect(normalizeMcpCellValues(columns, { owner: 'Nadie' }, people).getError()).toContain('Nadie');
  });

  it('refuses the title as a property, since the title is set on its own', () => {
    expect(normalizeMcpCellValues(columns, { Título: 'Otro' }, people).getError()).toContain('title');
  });

  it('refuses a date that is not a calendar day, and a number that is not one', () => {
    expect(normalizeMcpCellValues(columns, { due: 'mañana' }, people).isFail()).toBe(true);
    expect(normalizeMcpCellValues(columns, { hours: 'ocho' }, people).isFail()).toBe(true);
  });
});
