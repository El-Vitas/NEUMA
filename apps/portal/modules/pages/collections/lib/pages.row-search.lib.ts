import { getPagePropertyLogicalType, PAGE_PROPERTY_LOGICAL_TYPE } from '@neuma/shared';
import { foldPageLookingText } from '../../links/lib/pages.looking.lib';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';

/**
 * Title plus text answers only: numbers and dates are not searched, since typing "3" would match half the
 * collection. Built once where the row is rendered so each keystroke does not rebuild it.
 */
export const buildRowSearchText = (row: PageRow, properties: readonly PageSchemaProperty[]): string => {
  const answered = properties
    .filter((property) => getPagePropertyLogicalType(property.type) === PAGE_PROPERTY_LOGICAL_TYPE.TEXT)
    .map((property) => row.propertyValues?.[property.key])
    .filter((value): value is string => typeof value === 'string');
  return foldPageLookingText([row.title, ...answered].join(' '));
};

/** An empty query matches every row. */
export const rowMatchesQuery = (searchText: string, query: string): boolean => {
  const wanted = foldPageLookingText(query).trim();
  return wanted === '' || searchText.includes(wanted);
};
