import { PAGE_PROPERTY_TYPE, PAGE_PROPERTY_TYPE_VALUES } from '@company-brain/shared';

/** The title is excluded: a collection already has exactly one. */
export const PAGE_ADDABLE_PROPERTY_TYPES = PAGE_PROPERTY_TYPE_VALUES.filter(
  (type) => type !== PAGE_PROPERTY_TYPE.TITLE,
);
