import { describe, expect, it } from 'bun:test';
import { describeMcpRowProperties } from '@/modules/mcp/lib/mcp.properties.lib';

const columns = [
  { key: 'status', label: 'Estado', type: 'SELECT' },
  { key: 'owner', label: 'Responsable', type: 'TEXT' },
  { key: 'due', label: 'Vence', type: 'DATE' },
];

const nobody = new Map<string, string>();

describe('describeMcpRowProperties', () => {
  it('names each value by its column, in the order the collection shows them', () => {
    expect(describeMcpRowProperties(columns, { due: '2026-10-01', status: 'En curso' }, 'Tarea', nobody)).toEqual([
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
      { owner: 'u-1', reviewers: ['u-2', 'gone'] },
      'Tarea',
      people,
    );

    expect(described).toEqual([
      { key: 'owner', label: 'Responsable', people: [{ id: 'u-1', name: 'Ana Pérez' }], type: 'PERSON', value: 'u-1' },
      {
        key: 'reviewers',
        label: 'Revisan',
        people: [{ id: 'u-2', name: 'Luis Soto' }],
        type: 'PERSON',
        value: ['u-2', 'gone'],
      },
    ]);
  });
});
