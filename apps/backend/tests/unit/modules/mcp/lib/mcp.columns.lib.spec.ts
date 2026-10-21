import { describe, expect, it } from 'bun:test';
import { DEFAULT_PAGE_PROPERTY_CONFIG, type PagePropertyType } from '@neuma/shared';
import {
  hideMcpNames,
  listMcpNames,
  normalizeMcpCellValues,
  readMcpRelationRequests,
  resolveMcpColumn,
} from '@/modules/mcp/lib/mcp.columns.lib';
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
  options: options?.map((value, index) => ({ color: null, group: null, id: `${key}-${String(index)}`, value })) ?? null,
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
  { email: 'ana@example.com', id: 'u-1', name: 'Ana Pérez' },
  { email: 'luis@example.com', id: 'u-2', name: 'Luis Soto' },
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
  it('turns names into what the collection stores: the id of the option, the people by their id', () => {
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
      listMcpNames,
    );

    expect(normalized.getValue()).toEqual({
      done: true,
      due: { start: '2026-10-01' },
      hours: 8,
      owner: ['u-1'],
      status: 'status-1',
      tags: ['tags-0'],
    });
  });

  it('takes a person by their id too, and null to empty a cell', () => {
    expect(normalizeMcpCellValues(columns, { owner: 'u-2', status: null }, people, listMcpNames).getValue()).toEqual({
      owner: ['u-2'],
      status: null,
    });
  });

  it('takes several people for a person column, and a range of dates', () => {
    const normalized = normalizeMcpCellValues(
      columns,
      { due: '2026-10-01/2026-10-05', owner: ['u-1', 'luis soto'] },
      people,
      listMcpNames,
    );

    expect(normalized.getValue()).toEqual({ due: { end: '2026-10-05', start: '2026-10-01' }, owner: ['u-1', 'u-2'] });
  });

  it('refuses a range that ends before it starts', () => {
    expect(normalizeMcpCellValues(columns, { due: '2026-10-05/2026-10-01' }, people, listMcpNames).isFail()).toBe(true);
  });

  it('reads the status, the links and the contact data of the new columns', () => {
    const extra = [
      column('stage', 'Etapa', 'STATUS', ['Sin empezar', 'En curso', 'Listo']),
      column('site', 'Sitio', 'URL'),
      column('mail', 'Correo', 'EMAIL'),
      column('phone', 'Teléfono', 'PHONE'),
    ];

    const normalized = normalizeMcpCellValues(
      extra,
      { Correo: 'ana@neuma.example', Etapa: 'listo', Sitio: 'https://neuma.example', Teléfono: '+56 9 1234 5678' },
      people,
      listMcpNames,
    );

    expect(normalized.getValue()).toEqual({
      mail: 'ana@neuma.example',
      phone: '+56 9 1234 5678',
      site: 'https://neuma.example',
      stage: 'stage-2',
    });
  });

  it('refuses a web address without its scheme and a malformed email', () => {
    const extra = [column('site', 'Sitio', 'URL'), column('mail', 'Correo', 'EMAIL')];

    expect(normalizeMcpCellValues(extra, { Sitio: 'neuma.example' }, people, listMcpNames).isFail()).toBe(true);
    expect(normalizeMcpCellValues(extra, { Correo: 'ana' }, people, listMcpNames).isFail()).toBe(true);
  });

  it('takes a percent as people read it and stores the fraction', () => {
    const percent: McpColumn = {
      ...column('progress', 'Avance', 'NUMBER'),
      config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, numberFormat: 'PERCENT' },
    };

    expect(normalizeMcpCellValues([percent], { Avance: 25 }, people, listMcpNames).getValue()).toEqual({
      progress: 0.25,
    });
  });

  it('refuses to write what the server fills', () => {
    const managed = [
      column('code', 'Código', 'UNIQUE_ID'),
      column('born', 'Creado', 'CREATED_TIME'),
      column('edited', 'Editado', 'EDITED_TIME'),
      column('by', 'Autor', 'CREATED_BY'),
      column('last', 'Último', 'EDITED_BY'),
    ];

    for (const name of ['Código', 'Creado', 'Editado', 'Autor', 'Último']) {
      expect(normalizeMcpCellValues(managed, { [name]: 'x' }, people, listMcpNames).isFail()).toBe(true);
    }
  });

  it('takes files as a list of ids and refuses anything else', () => {
    const files = [column('docs', 'Archivos', 'FILES')];

    expect(normalizeMcpCellValues(files, { Archivos: ['f-1', 'f-2', 'f-1'] }, people, listMcpNames).getValue()).toEqual(
      {
        docs: ['f-1', 'f-2'],
      },
    );
    expect(normalizeMcpCellValues(files, { Archivos: 5 }, people, listMcpNames).isFail()).toBe(true);
    expect(normalizeMcpCellValues(files, { Archivos: null }, people, listMcpNames).getValue()).toEqual({ docs: null });
  });

  it('gives a status by the name of its option or by its id', () => {
    const status = [column('stage', 'Etapa', 'STATUS', ['Pendiente', 'Hecha'])];

    expect(normalizeMcpCellValues(status, { Etapa: 'hecha' }, people, listMcpNames).getValue()).toEqual({
      stage: 'stage-1',
    });
    expect(normalizeMcpCellValues(status, { Etapa: 'stage-0' }, people, listMcpNames).getValue()).toEqual({
      stage: 'stage-0',
    });
  });

  it('finds a person by their email as well', () => {
    expect(normalizeMcpCellValues(columns, { owner: 'LUIS@example.com' }, people, listMcpNames).getValue()).toEqual({
      owner: ['u-2'],
    });
  });

  it('leaves the relation out of the cells and reads it apart', () => {
    const linked = [column('rel', 'Proyecto', 'RELATION')];

    expect(normalizeMcpCellValues(linked, { Proyecto: { add: ['Alfa'] } }, people, listMcpNames).getValue()).toEqual(
      {},
    );
  });
});

describe('readMcpRelationRequests', () => {
  const linked = [
    column('title', 'Título', 'TITLE'),
    column('rel', 'Proyecto', 'RELATION'),
    column('x', 'X', 'NUMBER'),
  ];

  it('reads add and remove as they were given', () => {
    const requests = readMcpRelationRequests(
      linked,
      { Proyecto: { add: ['Alfa'], remove: ['Beta'] }, X: 3 },
      listMcpNames,
    ).getValue();

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ add: ['Alfa'], remove: ['Beta'], set: null });
    expect(requests[0]?.column.key).toBe('rel');
  });

  it('reads a list or one row as the whole cell, and null as emptying it', () => {
    expect(readMcpRelationRequests(linked, { Proyecto: ['Alfa', 'Beta'] }, listMcpNames).getValue()[0]).toMatchObject({
      set: ['Alfa', 'Beta'],
    });
    expect(readMcpRelationRequests(linked, { Proyecto: 'Alfa' }, listMcpNames).getValue()[0]).toMatchObject({
      set: ['Alfa'],
    });
    expect(readMcpRelationRequests(linked, { Proyecto: null }, listMcpNames).getValue()[0]).toMatchObject({ set: [] });
  });

  it('refuses a row that is not a name or an id, and a column that is not there', () => {
    expect(readMcpRelationRequests(linked, { Proyecto: { add: [''] } }, listMcpNames).isFail()).toBe(true);
    expect(readMcpRelationRequests(linked, { Nada: ['x'] }, listMcpNames).isFail()).toBe(true);
  });

  it('refuses an option the column does not have, and says which ones it has', () => {
    const refused = normalizeMcpCellValues(columns, { Estado: 'Bloqueado' }, people, listMcpNames);

    expect(refused.isFail()).toBe(true);
    expect(refused.getError()).toContain('Bloqueado');
    expect(refused.getError()).toContain('Por hacer, En curso, Hecho');
  });

  it('refuses a column the collection does not have, and says which ones it has', () => {
    const refused = normalizeMcpCellValues(columns, { Prioridad: 'Alta' }, people, listMcpNames);

    expect(refused.getError()).toContain('Prioridad');
    expect(refused.getError()).toContain('Estado (status)');
  });

  it('refuses without naming what there is when the names are kept from the agent', () => {
    const noColumn = normalizeMcpCellValues(columns, { Prioridad: 'Alta' }, people, hideMcpNames);
    const noOption = normalizeMcpCellValues(columns, { Estado: 'Bloqueado' }, people, hideMcpNames);

    expect(noColumn.getError()).toBe('The collection has no column "Prioridad".');
    expect(noOption.getError()).toBe('Estado has no option "Bloqueado".');
  });

  it('refuses a person who is not in the workspace', () => {
    expect(normalizeMcpCellValues(columns, { owner: 'Nadie' }, people, listMcpNames).getError()).toContain('Nadie');
  });

  it('refuses a name two people share, asking for the person by id, and takes either by id', () => {
    const namesakes = [...people, { email: 'ana.otra@example.com', id: 'u-3', name: 'Ana Pérez' }];

    const byName = normalizeMcpCellValues(columns, { owner: 'ana pérez' }, namesakes, listMcpNames);
    const byId = normalizeMcpCellValues(columns, { owner: 'u-3' }, namesakes, listMcpNames);

    expect(byName.getError()).toContain('more than one person called "ana pérez"');
    expect(byId.getValue()).toEqual({ owner: ['u-3'] });
  });

  it('refuses the title as a property, since the title is set on its own', () => {
    expect(normalizeMcpCellValues(columns, { Título: 'Otro' }, people, listMcpNames).getError()).toContain('title');
  });

  it('refuses a date that is not a calendar day, and a number that is not one', () => {
    expect(normalizeMcpCellValues(columns, { due: 'mañana' }, people, listMcpNames).isFail()).toBe(true);
    expect(normalizeMcpCellValues(columns, { hours: 'ocho' }, people, listMcpNames).isFail()).toBe(true);
  });
});
