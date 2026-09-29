import { DatabasePropertyType } from '@company-brain/db';
import type { PagePropertyValue, PagePropertyValues } from '@company-brain/shared';
import type { McpRowProperty, McpSchemaColumn } from '../types/mcp.types';

/** Un valor tal como sale hacia el agente: una lista, copiada; nada, si la fila no tiene valor. */
const copyValue = (value: PagePropertyValue | undefined): McpRowProperty['value'] => {
  if (value === undefined) return null;
  return typeof value === 'object' ? [...value] : value;
};

/**
 * Las propiedades de una fila, cada una con el nombre de su columna.
 *
 * Van todas las columnas de la colección, en su orden, también las que la fila
 * deja vacías: saber que una tarea no tiene responsable también es saber algo.
 * La columna del título se lee del título de la fila, que es donde vive. Un
 * valor de una columna que ya no existe no se muestra.
 */
export const describeMcpRowProperties = (
  columns: readonly McpSchemaColumn[],
  values: PagePropertyValues | null,
  title: string,
): McpRowProperty[] =>
  columns.map((column) => ({
    key: column.key,
    label: column.label,
    type: column.type,
    value: column.type === DatabasePropertyType.TITLE ? title : copyValue(values?.[column.key]),
  }));
