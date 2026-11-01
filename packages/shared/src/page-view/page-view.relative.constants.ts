import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import type { PagePropertyType } from '../types/page-schema.types.js';

/** In a person or author filter, the viewer of the view, not whoever saved it. */
export const PAGE_FILTER_ME = '@me';

/** The fixed words a date filter may carry instead of a day. Days to count are written as `@past_days:7`. */
export const PAGE_RELATIVE_DATE = {
  LAST_MONTH: '@last_month',
  LAST_WEEK: '@last_week',
  NEXT_MONTH: '@next_month',
  NEXT_WEEK: '@next_week',
  THIS_MONTH: '@this_month',
  THIS_WEEK: '@this_week',
  TODAY: '@today',
  TOMORROW: '@tomorrow',
  YESTERDAY: '@yesterday',
} as const;

export const PAGE_RELATIVE_PAST_DAYS_PREFIX = '@past_days:';

export const PAGE_RELATIVE_NEXT_DAYS_PREFIX = '@next_days:';

export const PAGE_RELATIVE_MAXIMUM_DAYS = 365;

/** Every word a person can pick in the portal, in the order it offers them. */
export const PAGE_RELATIVE_DATE_VALUES = [
  PAGE_RELATIVE_DATE.TODAY,
  PAGE_RELATIVE_DATE.YESTERDAY,
  PAGE_RELATIVE_DATE.TOMORROW,
  PAGE_RELATIVE_DATE.THIS_WEEK,
  PAGE_RELATIVE_DATE.LAST_WEEK,
  PAGE_RELATIVE_DATE.NEXT_WEEK,
  PAGE_RELATIVE_DATE.THIS_MONTH,
  PAGE_RELATIVE_DATE.LAST_MONTH,
  PAGE_RELATIVE_DATE.NEXT_MONTH,
] as const;

/** Properties that hold a moment: a relative date means something on them. */
export const PAGE_RELATIVE_DATE_PROPERTY_TYPES: readonly PagePropertyType[] = [
  PAGE_PROPERTY_TYPE.DATE,
  PAGE_PROPERTY_TYPE.CREATED_TIME,
  PAGE_PROPERTY_TYPE.EDITED_TIME,
];

/** Properties that hold a member of the space: "me" means something on them. */
export const PAGE_FILTER_ME_PROPERTY_TYPES: readonly PagePropertyType[] = [
  PAGE_PROPERTY_TYPE.PERSON,
  PAGE_PROPERTY_TYPE.CREATED_BY,
  PAGE_PROPERTY_TYPE.EDITED_BY,
];

/** Any value that starts with this is meant as a marker, so a mistyped one is refused instead of compared as text. */
export const PAGE_FILTER_MARKER_PREFIX = '@';
