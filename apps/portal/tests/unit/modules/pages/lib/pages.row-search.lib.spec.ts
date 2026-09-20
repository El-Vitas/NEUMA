import { describe, expect, it } from 'bun:test';
import { buildRowSearchText, rowMatchesQuery } from '@/modules/pages/collections/lib/pages.row-search.lib';
import type { PageRow, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions } from './pages.options.fixture';

const properties: PageSchemaProperty[] = [
  { key: 'description', label: 'Description', options: null, required: false, type: 'RICH_TEXT' },
  { key: 'status', label: 'Status', options: asPropertyOptions('todo', 'done'), required: false, type: 'SELECT' },
  { key: 'dueDate', label: 'Due date', options: null, required: false, type: 'DATE' },
];

const row: PageRow = {
  id: 'row-1',
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues: { description: 'Preparar la reunión con Dirección', dueDate: '2026-08-14', status: 'todo' },
  spaceId: 'space-1',
  title: 'Revisar el informe',
};

describe('lo que una fila dice en palabras', () => {
  it('junta el nombre con lo que se responde escribiendo', () => {
    const searchText = buildRowSearchText(row, properties);

    expect(searchText).toContain('revisar el informe');
    expect(searchText).toContain('preparar la reunion con direccion');
  });

  /** Quien escribe «agosto» no busca `2026-08-14`, y quien escribe «3» encontraría media colección. */
  it('deja fuera lo que no son palabras', () => {
    expect(buildRowSearchText(row, properties)).not.toContain('2026');
  });
});

describe('quién cae dentro de lo buscado', () => {
  const searchText = buildRowSearchText(row, properties);

  it('encuentra por el nombre', () => {
    expect(rowMatchesQuery(searchText, 'informe')).toBe(true);
  });

  it('encuentra por lo que dice una propiedad de texto', () => {
    expect(rowMatchesQuery(searchText, 'reunión')).toBe(true);
  });

  /** Se busca como se escribe, no como se acentúa: «direccion» encuentra «Dirección». */
  it('no se pelea con los acentos ni con las mayúsculas', () => {
    expect(rowMatchesQuery(searchText, 'DIRECCION')).toBe(true);
  });

  it('no encuentra lo que la fila no dice', () => {
    expect(rowMatchesQuery(searchText, 'presupuesto')).toBe(false);
  });

  /** Un buscador vacío no es una condición: es un buscador esperando. */
  it('deja pasar a todas mientras no se escriba nada', () => {
    expect(rowMatchesQuery(searchText, '')).toBe(true);
    expect(rowMatchesQuery(searchText, '   ')).toBe(true);
  });
});
