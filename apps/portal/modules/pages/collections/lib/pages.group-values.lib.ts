import { PAGE_PROPERTY_TYPE } from '@neuma/shared';
import type { PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';

/**
 * A group is named by text, but the property it groups by may hold something else: a date is a record, a number is
 * a number. Writing the text as it is would be refused, so a drop or a new card converts it first.
 */
export const toGroupPropertyValue = (
  properties: readonly PageSchemaProperty[],
  propertyKey: string,
  groupKey: string,
): PagePropertyValue => {
  const type = properties.find((property) => property.key === propertyKey)?.type;
  switch (type) {
    case PAGE_PROPERTY_TYPE.DATE:
      return { start: groupKey };
    case PAGE_PROPERTY_TYPE.NUMBER:
      return Number(groupKey);
    case PAGE_PROPERTY_TYPE.CHECKBOX:
      return groupKey === 'true';
    default:
      return groupKey;
  }
};
