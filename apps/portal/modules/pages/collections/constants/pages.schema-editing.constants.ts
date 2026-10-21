import type { PagePropertyType } from '@neuma/shared';
import { PAGE_PROPERTY_TYPE, PAGE_PROPERTY_TYPE_VALUES } from '@neuma/shared';

/** The title is excluded: a collection already has exactly one. */
export const PAGE_ADDABLE_PROPERTY_TYPES = PAGE_PROPERTY_TYPE_VALUES.filter(
  (type) => type !== PAGE_PROPERTY_TYPE.TITLE,
);

/**
 * Types whose stored values only make sense for that type: ids of options, rows or files, or numbers and dates the
 * server writes. Turning a property into one of them, or out of it, would leave rows the property cannot read.
 */
export const PAGE_TYPE_CHANGE_LOCKED_TYPES: readonly PagePropertyType[] = [
  PAGE_PROPERTY_TYPE.STATUS,
  PAGE_PROPERTY_TYPE.RELATION,
  PAGE_PROPERTY_TYPE.FILES,
  PAGE_PROPERTY_TYPE.UNIQUE_ID,
  PAGE_PROPERTY_TYPE.CREATED_TIME,
  PAGE_PROPERTY_TYPE.EDITED_TIME,
  PAGE_PROPERTY_TYPE.CREATED_BY,
  PAGE_PROPERTY_TYPE.EDITED_BY,
];

export const DRAFT_OPTION_ID_LENGTH = 8;

/** Radix refuses an empty value, so "no limit on decimals" needs a stand-in. */
export const PAGE_DECIMALS_ANY_CHOICE = 'any';

export const PAGE_DECIMAL_CHOICES: readonly number[] = [0, 1, 2, 3, 4];
