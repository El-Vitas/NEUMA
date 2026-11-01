import { formatPageDate, isPageDateValue } from '../page-property/page-property.date.lib.js';
import type { PageDateValue } from '../page-property/page-property.types.js';
import type { PageFormulaScalar, PageFormulaValue } from './page-formula.types.js';

const isListValue = (value: PageFormulaValue | undefined): value is readonly PageFormulaScalar[] =>
  Array.isArray(value);

export const readFormulaNumber = (value: PageFormulaValue | undefined): number | null =>
  typeof value === 'number' ? value : null;

export const readFormulaText = (value: PageFormulaValue | undefined): string | null =>
  typeof value === 'string' ? value : null;

export const readFormulaDate = (value: PageFormulaValue | undefined): PageDateValue | null => {
  if (value === undefined || value === null || isListValue(value)) return null;
  return isPageDateValue(value) ? value : null;
};

export const readFormulaList = (value: PageFormulaValue | undefined): readonly PageFormulaScalar[] =>
  isListValue(value) ? value : [];

const formatScalar = (value: PageFormulaScalar): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return formatPageDate(value);
  return String(value);
};

/** How a value reads inside a piece of text. An empty value reads as nothing. */
export const formatFormulaValue = (value: PageFormulaValue | undefined): string => {
  if (value === null || value === undefined) return '';
  if (isListValue(value)) return value.map(formatScalar).join(', ');
  return formatScalar(value);
};

/** Whether a value counts as empty: nothing, blank text or a list with no entries. */
export const isFormulaValueEmpty = (value: PageFormulaValue | undefined): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return isListValue(value) && value.length === 0;
};

/** Equality between two values of one type; an empty value equals only another empty one. */
export const areFormulaValuesEqual = (left: PageFormulaValue, right: PageFormulaValue): boolean => {
  if (left === null || right === null) return left === right;
  if (isListValue(left) || isListValue(right)) return false;
  if (typeof left === 'object' && typeof right === 'object')
    return left.start === right.start && left.end === right.end;
  return left === right;
};

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;
  return left > right ? 1 : 0;
};

/** Orders two values of one type: numbers by size, text by letters and dates by their start. */
export const compareFormulaValues = (left: PageFormulaScalar, right: PageFormulaScalar): number => {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  if (typeof left === 'string' && typeof right === 'string') return compareText(left, right);
  if (typeof left === 'object' && typeof right === 'object') return Date.parse(left.start) - Date.parse(right.start);
  return 0;
};
