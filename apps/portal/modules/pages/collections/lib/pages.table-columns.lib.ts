import {
  PAGE_COLLECTION_TITLE_PROPERTY_KEY,
  PAGE_TABLE_DEFAULT_COLUMN_WIDTH,
  PAGE_TABLE_FROZEN_CELL_CLASS,
  PAGE_TABLE_MAXIMUM_COLUMN_WIDTH,
  PAGE_TABLE_MINIMUM_COLUMN_WIDTH,
  PAGE_TABLE_TITLE_COLUMN_WIDTH,
} from '../constants/pages.collections.constants';

/**
 * Las columnas de una tabla, de izquierda a derecha.
 *
 * La del nombre va siempre primera y no es una propiedad más: es la que abre
 * cada fila. Aun así se nombra como las demás, porque para medirla, moverla o
 * dejarla quieta da igual lo que sea.
 */
export const listTableColumnKeys = (propertyKeys: readonly string[]): readonly string[] => [
  PAGE_COLLECTION_TITLE_PROPERTY_KEY,
  ...propertyKeys,
];

export const readTableColumnWidth = (widths: Readonly<Record<string, number>>, columnKey: string): number => {
  const given = widths[columnKey];
  if (given !== undefined) return given;
  return columnKey === PAGE_COLLECTION_TITLE_PROPERTY_KEY
    ? PAGE_TABLE_TITLE_COLUMN_WIDTH
    : PAGE_TABLE_DEFAULT_COLUMN_WIDTH;
};

/** Ni tan angosta que no se lea, ni tan ancha que no quepa con las demás. */
export const clampTableColumnWidth = (width: number): number =>
  Math.min(Math.max(Math.round(width), PAGE_TABLE_MINIMUM_COLUMN_WIDTH), PAGE_TABLE_MAXIMUM_COLUMN_WIDTH);

/**
 * A qué distancia del borde izquierdo empieza cada columna.
 *
 * Es lo que necesita una columna que se queda quieta al desplazarse: pegarse a
 * la izquierda sin saber cuánto ocupan las de antes la dejaría encima de ellas.
 * Se mide con los anchos guardados, no con los que se están arrastrando, para
 * que cabecera y cuerpo digan siempre lo mismo.
 */
export const readTableColumnOffsets = (
  columnKeys: readonly string[],
  widths: Readonly<Record<string, number>>,
): readonly number[] => {
  const offsets: number[] = [];
  let travelled = 0;
  for (const columnKey of columnKeys) {
    offsets.push(travelled);
    travelled += readTableColumnWidth(widths, columnKey);
  }
  return offsets;
};

/** Si esa columna es de las que se quedan quietas. */
export const isTableColumnFrozen = (position: number, frozenColumns: number): boolean => position < frozenColumns;

/**
 * Lo que hay que ponerle a una celda para que se quede quieta.
 *
 * Se pide desde la cabecera, desde el cuerpo y desde el pie, porque una columna
 * quieta lo es de arriba abajo: si el pie no se quedara, sus celdas pasarían por
 * debajo de las de arriba y la columna tendría un agujero.
 */
export const readTableFrozenCellProps = (
  position: number,
  frozenColumns: number,
  offsets: readonly number[],
): { readonly className?: string; readonly style?: { readonly left: number } } =>
  isTableColumnFrozen(position, frozenColumns)
    ? { className: PAGE_TABLE_FROZEN_CELL_CLASS, style: { left: offsets[position] ?? 0 } }
    : {};

/**
 * Con qué nombre se dice cada celda.
 *
 * Cada celda se dice por el encabezado de su columna en vez de repetir el nombre
 * en cada fila, así que el encabezado y las celdas tienen que coincidir en cómo
 * se llama ese encabezado.
 */
export const readTableColumnLabelId = (collectionPageId: string, columnKey: string): string =>
  `collection-column-${collectionPageId}-${columnKey}`;
