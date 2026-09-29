import { DatabasePropertyType } from '@company-brain/db';
import type { PagePropertyValue, PagePropertyValues } from '@company-brain/shared';
import type { McpSchemaColumn } from '../types/mcp.collections.types';
import type { McpPerson, McpRowProperty } from '../types/mcp.types';

/** Un valor tal como sale hacia el agente: una lista, copiada; nada, si la fila no tiene valor. */
const copyValue = (value: PagePropertyValue | undefined): McpRowProperty['value'] => {
  if (value === undefined) return null;
  return typeof value === 'object' ? [...value] : value;
};

/** Los ids a los que apunta un valor: uno, varios, o ninguno. */
const listIds = (value: McpRowProperty['value']): readonly string[] => {
  if (typeof value === 'string') return [value];
  return Array.isArray(value) ? value : [];
};

/** Las personas de un valor que existen en el espacio de trabajo, con su nombre. */
const namePeople = (value: McpRowProperty['value'], people: ReadonlyMap<string, string>): McpPerson[] =>
  listIds(value).flatMap((id) => {
    const name = people.get(id);
    return name === undefined ? [] : [{ id, name }];
  });

const describeColumn = (
  column: McpSchemaColumn,
  values: PagePropertyValues | null,
  title: string,
  people: ReadonlyMap<string, string>,
): McpRowProperty => {
  const value = column.type === DatabasePropertyType.TITLE ? title : copyValue(values?.[column.key]);
  const described = { key: column.key, label: column.label, type: column.type, value };
  return column.type === DatabasePropertyType.PERSON ? { ...described, people: namePeople(value, people) } : described;
};

/**
 * Las propiedades de una fila, cada una con el nombre de su columna.
 *
 * Van todas las columnas de la colección, en su orden, también las que la fila
 * deja vacías: saber que una tarea no tiene responsable también es saber algo.
 * La columna del título se lee del título de la fila, que es donde vive, y una
 * columna de personas dice quiénes son por su nombre. Un valor de una columna
 * que ya no existe no se muestra.
 */
export const describeMcpRowProperties = (
  columns: readonly McpSchemaColumn[],
  values: PagePropertyValues | null,
  title: string,
  people: ReadonlyMap<string, string>,
): McpRowProperty[] => columns.map((column) => describeColumn(column, values, title, people));
