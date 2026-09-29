import { describe, expect, it } from 'bun:test';
import { describeMcpRowProperties } from '@/modules/mcp/lib/mcp.properties.lib';

const columns = [
  { key: 'status', label: 'Estado', type: 'SELECT' },
  { key: 'owner', label: 'Responsable', type: 'TEXT' },
  { key: 'due', label: 'Vence', type: 'DATE' },
];

describe('describeMcpRowProperties', () => {
  it('names each value by its column, in the order the collection shows them', () => {
    expect(describeMcpRowProperties(columns, { due: '2026-10-01', status: 'En curso' }, 'Tarea')).toEqual([
      { key: 'status', label: 'Estado', type: 'SELECT', value: 'En curso' },
      { key: 'owner', label: 'Responsable', type: 'TEXT', value: null },
      { key: 'due', label: 'Vence', type: 'DATE', value: '2026-10-01' },
    ]);
  });

  it('leaves out a value whose column no longer exists', () => {
    expect(describeMcpRowProperties(columns, { gone: 'x' }, 'Tarea').map((property) => property.key)).toEqual([
      'status',
      'owner',
      'due',
    ]);
  });

  it('has nothing to say for a page that is not a row', () => {
    expect(describeMcpRowProperties([], null, 'Sin filas')).toEqual([]);
  });

  it('reads the title column from the title of the row, which is where it lives', () => {
    const titled = describeMcpRowProperties([{ key: 'title', label: 'Título', type: 'TITLE' }], {}, 'Escribir el plan');

    expect(titled).toEqual([{ key: 'title', label: 'Título', type: 'TITLE', value: 'Escribir el plan' }]);
  });
});
