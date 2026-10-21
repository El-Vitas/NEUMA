import type { PagePropertyValue } from './page-property.types.js';

/** `Array.isArray` alone narrows to `any[]`; this keeps the element type. */
export const isStringList = (value: PagePropertyValue): value is readonly string[] => Array.isArray(value);

export const toValueList = (value: PagePropertyValue): readonly string[] => (isStringList(value) ? value : []);

/** The text of a value that is text, a number or a boolean. A list or a date has no single text. */
export const toValueText = (value: PagePropertyValue): string => {
  if (typeof value === 'object') return '';
  return String(value);
};
