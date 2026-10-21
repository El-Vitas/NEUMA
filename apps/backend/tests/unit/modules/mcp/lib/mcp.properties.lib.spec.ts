import { describe, expect, it } from 'bun:test';
import { DEFAULT_PAGE_PROPERTY_CONFIG, PAGE_NUMBER_FORMAT, PAGE_STATUS_GROUP } from '@neuma/shared';
import { describeMcpRowProperties } from '@/modules/mcp/lib/mcp.properties.lib';

const columns = [
  {
    key: 'status',
    label: 'Estado',
    options: [
      { color: null, group: null, id: 'todo0001', value: 'Por hacer' },
      { color: null, group: null, id: 'doing001', value: 'En curso' },
    ],
    type: 'SELECT',
  },
  { key: 'owner', label: 'Responsable', type: 'TEXT' },
  { key: 'due', label: 'Vence', type: 'DATE' },
];

const nobody = new Map<string, string>();

describe('describeMcpRowProperties — computed numbers', () => {
  const unit = { key: 'unit', label: 'Unitario', type: 'FORMULA' };

  it('keeps the raw number in value and adds the text a person reads', () => {
    expect(describeMcpRowProperties([unit], { unit: 10 / 3 }, 'Fila', nobody)).toEqual([
      { key: 'unit', label: 'Unitario', text: '3.33', type: 'FORMULA', value: 10 / 3 },
    ]);
  });

  it('adds no text when the number already reads the same', () => {
    expect(describeMcpRowProperties([unit], { unit: 30 }, 'Fila', nobody)).toEqual([
      { key: 'unit', label: 'Unitario', type: 'FORMULA', value: 30 },
    ]);
  });
});

describe('describeMcpRowProperties', () => {
  it('names each value by its column, in the order the collection shows them, an option by its name', () => {
    expect(
      describeMcpRowProperties(columns, { due: { start: '2026-10-01' }, status: 'doing001' }, 'Tarea', nobody),
    ).toEqual([
      { key: 'status', label: 'Estado', type: 'SELECT', value: 'En curso' },
      { key: 'owner', label: 'Responsable', type: 'TEXT', value: null },
      { key: 'due', label: 'Vence', type: 'DATE', value: '2026-10-01' },
    ]);
  });

  it('leaves out a value whose column no longer exists', () => {
    expect(describeMcpRowProperties(columns, { gone: 'x' }, 'Tarea', nobody).map((property) => property.key)).toEqual([
      'status',
      'owner',
      'due',
    ]);
  });

  it('says nothing for an option the column no longer has', () => {
    expect(describeMcpRowProperties(columns, { status: 'gone0000' }, 'Tarea', nobody)[0]?.value).toBeNull();
  });

  it('has nothing to say for a page that is not a row', () => {
    expect(describeMcpRowProperties([], null, 'Sin filas', nobody)).toEqual([]);
  });

  it('reads the title column from the title of the row, which is where it lives', () => {
    const titled = describeMcpRowProperties(
      [{ key: 'title', label: 'Título', type: 'TITLE' }],
      {},
      'Escribir el plan',
      nobody,
    );

    expect(titled).toEqual([{ key: 'title', label: 'Título', type: 'TITLE', value: 'Escribir el plan' }]);
  });

  it('names the people a person column points at, by the name they have in the workspace', () => {
    const people = new Map([
      ['u-1', 'Ana Pérez'],
      ['u-2', 'Luis Soto'],
    ]);
    const described = describeMcpRowProperties(
      [
        { key: 'owner', label: 'Responsable', type: 'PERSON' },
        { key: 'reviewers', label: 'Revisan', type: 'PERSON' },
      ],
      { owner: ['u-1'], reviewers: ['u-2', 'gone'] },
      'Tarea',
      people,
    );

    expect(described).toEqual([
      {
        key: 'owner',
        label: 'Responsable',
        people: [{ id: 'u-1', name: 'Ana Pérez' }],
        type: 'PERSON',
        value: ['u-1'],
      },
      {
        key: 'reviewers',
        label: 'Revisan',
        people: [{ id: 'u-2', name: 'Luis Soto' }],
        type: 'PERSON',
        value: ['u-2', 'gone'],
      },
    ]);
  });

  it('writes a range as an interval, a unique id with its prefix and a percent as people read it', () => {
    const described = describeMcpRowProperties(
      [
        { key: 'when', label: 'Cuándo', type: 'DATE' },
        { config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, prefix: 'TSK' }, key: 'code', label: 'Código', type: 'UNIQUE_ID' },
        {
          config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, numberFormat: PAGE_NUMBER_FORMAT.PERCENT },
          key: 'progress',
          label: 'Avance',
          type: 'NUMBER',
        },
      ],
      { code: 7, progress: 0.25, when: { end: '2026-10-05', start: '2026-10-01' } },
      'Tarea',
      nobody,
    );

    expect(described.map((property) => property.value)).toEqual(['2026-10-01/2026-10-05', 'TSK-7', 25]);
  });

  it('names a status, the files of a row and the author, and lists the related rows it was told about', () => {
    const described = describeMcpRowProperties(
      [
        {
          key: 'stage',
          label: 'Etapa',
          options: [{ color: null, group: PAGE_STATUS_GROUP.COMPLETE, id: 'done0001', value: 'Listo' }],
          type: 'STATUS',
        },
        { key: 'docs', label: 'Archivos', type: 'FILES' },
        { key: 'author', label: 'Creó', type: 'CREATED_BY' },
        { key: 'project', label: 'Proyecto', type: 'RELATION' },
      ],
      { author: 'u-1', docs: ['file-1', 'file-9'], project: ['row-1', 'row-9'], stage: 'done0001' },
      'Tarea',
      new Map([['u-1', 'Ana Pérez']]),
      { files: new Map([['file-1', 'plan.pdf']]), rows: new Map([['row-1', 'Lanzamiento']]) },
    );

    expect(described).toEqual([
      { key: 'stage', label: 'Etapa', type: 'STATUS', value: 'Listo' },
      { key: 'docs', label: 'Archivos', type: 'FILES', value: ['plan.pdf'] },
      { key: 'author', label: 'Creó', people: [{ id: 'u-1', name: 'Ana Pérez' }], type: 'CREATED_BY', value: 'u-1' },
      {
        key: 'project',
        label: 'Proyecto',
        related: [{ id: 'row-1', title: 'Lanzamiento' }],
        type: 'RELATION',
        value: ['row-1', 'row-9'],
      },
    ]);
  });
});
