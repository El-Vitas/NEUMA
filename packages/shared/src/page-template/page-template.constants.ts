import { PAGE_FILTER_ME, PAGE_RELATIVE_DATE } from '../page-view/page-view.relative.constants.js';

/** Where a template page keeps its marker, and where a collection keeps the template new rows start from. */
export const PAGE_TEMPLATE_KEY = 'template';
export const PAGE_DEFAULT_TEMPLATE_KEY = 'defaultTemplateId';

/** The two words a template can leave in a column to be filled when a row is made from it. */
export const PAGE_TEMPLATE_VARIABLE = {
  ME: PAGE_FILTER_ME,
  TODAY: PAGE_RELATIVE_DATE.TODAY,
} as const;

export const PAGE_TEMPLATE_VARIABLE_VALUES = [PAGE_TEMPLATE_VARIABLE.TODAY, PAGE_TEMPLATE_VARIABLE.ME] as const;

/** A collection keeps at most this many templates, so the picker stays a short list. */
export const PAGE_TEMPLATE_MAXIMUM_PER_COLLECTION = 50;
