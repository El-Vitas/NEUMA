import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import type { PagePropertyValue, PagePropertyValues } from './page-property.types.js';

/** What the columns of a block say about who made it and when. These are never copied into `values`. */
export interface PageRowAuthorship {
  readonly createdAt: string;
  readonly createdById: string;
  readonly editedAt: string;
  readonly editedById: string;
}

const readDerivedValue = (type: PagePropertyType, authorship: PageRowAuthorship): PagePropertyValue | null => {
  switch (type) {
    case PAGE_PROPERTY_TYPE.CREATED_TIME:
      return { start: authorship.createdAt };
    case PAGE_PROPERTY_TYPE.EDITED_TIME:
      return { start: authorship.editedAt };
    case PAGE_PROPERTY_TYPE.CREATED_BY:
      return authorship.createdById;
    case PAGE_PROPERTY_TYPE.EDITED_BY:
      return authorship.editedById;
    default:
      return null;
  }
};

/**
 * The values of a row as the filter, sort and group engine reads them: what the row stores plus what its block says.
 * A derived column always wins over anything stored under its key.
 */
export const withPageDerivedValues = (
  properties: readonly { readonly key: string; readonly type: PagePropertyType }[],
  stored: PagePropertyValues,
  authorship: PageRowAuthorship,
): PagePropertyValues => {
  const derived = properties.flatMap((property) => {
    const value = readDerivedValue(property.type, authorship);
    return value === null ? [] : [[property.key, value] as const];
  });
  return { ...stored, ...Object.fromEntries(derived) };
};
