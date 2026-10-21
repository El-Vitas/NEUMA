import { PAGE_COLLECTION_TITLE_PROPERTY_KEY } from '@neuma/shared';
import {
  PAGE_TABLE_DEFAULT_COLUMN_WIDTH,
  PAGE_TABLE_FROZEN_CELL_CLASS,
  PAGE_TABLE_MAXIMUM_COLUMN_WIDTH,
  PAGE_TABLE_MINIMUM_COLUMN_WIDTH,
  PAGE_TABLE_TITLE_COLUMN_WIDTH,
} from '../constants/pages.collections.constants';
import type { PageSchemaProperty } from '../types/pages.schema.types';

/** A required column carries an asterisk, since the server refuses a row without it. */
export const readColumnLabel = (property: PageSchemaProperty | undefined, columnKey: string): string => {
  if (property === undefined) return columnKey;
  return property.required ? `${property.label} *` : property.label;
};

/** The title column is always first; it is keyed like any other so width and freezing treat it uniformly. */
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

export const clampTableColumnWidth = (width: number): number =>
  Math.min(Math.max(Math.round(width), PAGE_TABLE_MINIMUM_COLUMN_WIDTH), PAGE_TABLE_MAXIMUM_COLUMN_WIDTH);

/** Left offsets for frozen columns, from the saved widths (not mid-drag ones) so header and body agree. */
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

export const isTableColumnFrozen = (position: number, frozenColumns: number): boolean => position < frozenColumns;

/** Used by header, body and footer alike: a frozen column must be frozen top to bottom. */
export const readTableFrozenCellProps = (
  position: number,
  frozenColumns: number,
  offsets: readonly number[],
): { readonly className?: string; readonly style?: { readonly left: number } } =>
  isTableColumnFrozen(position, frozenColumns)
    ? { className: PAGE_TABLE_FROZEN_CELL_CLASS, style: { left: offsets[position] ?? 0 } }
    : {};

/** Shared by the header and its cells so cells are labelled by the header instead of repeating the name per row. */
export const readTableColumnLabelId = (collectionPageId: string, columnKey: string): string =>
  `collection-column-${collectionPageId}-${columnKey}`;
