import { describe, expect, it } from 'bun:test';
import { buildNewRowPropertyValues } from '@/modules/pages/collections/lib/pages.board-drag.lib';

describe('what a row created inside a column already holds', () => {
  /** Crear en una columna es decir a qué columna pertenece: nace ahí, no fuera. */
  it('is born with the value of the column it was created in', () => {
    expect(buildNewRowPropertyValues('status', 'doing')).toEqual({ status: 'doing' });
  });

  /** La columna de las filas sin valor no es un valor: allí la fila nace sin responder nada. */
  it('is born with nothing when it was created among the rows without a value', () => {
    expect(buildNewRowPropertyValues('status', 'unassigned')).toEqual({});
  });
});
