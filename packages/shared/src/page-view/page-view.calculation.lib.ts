import { getPagePropertyLogicalType, isPagePropertyValueEmpty } from '../page-property/page-property.lib.js';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE } from '../page-property/page-property.types.js';
import type { PagePropertyType } from '../types/page-schema.types.js';
import type { PageViewCalculation } from './page-view.types.js';
import { PAGE_VIEW_CALCULATION } from './page-view.types.js';

const CALCULATIONS_FOR_EVERY_PROPERTY = [
  PAGE_VIEW_CALCULATION.NONE,
  PAGE_VIEW_CALCULATION.COUNT_ALL,
  PAGE_VIEW_CALCULATION.COUNT_FILLED,
  PAGE_VIEW_CALCULATION.COUNT_EMPTY,
] as const;

const CALCULATIONS_FOR_NUMBERS = [
  PAGE_VIEW_CALCULATION.SUM,
  PAGE_VIEW_CALCULATION.AVERAGE,
  PAGE_VIEW_CALCULATION.MINIMUM,
  PAGE_VIEW_CALCULATION.MAXIMUM,
  PAGE_VIEW_CALCULATION.MEDIAN,
] as const;

const CALCULATIONS_BY_LOGICAL_TYPE: Readonly<Record<string, readonly PageViewCalculation[]>> = {
  [PAGE_PROPERTY_LOGICAL_TYPE.NUMBER]: CALCULATIONS_FOR_NUMBERS,
  [PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN]: [PAGE_VIEW_CALCULATION.PERCENT_CHECKED],
};

export const listPageCalculationsFor = (type: PagePropertyType): readonly PageViewCalculation[] => [
  ...CALCULATIONS_FOR_EVERY_PROPERTY,
  ...(CALCULATIONS_BY_LOGICAL_TYPE[getPagePropertyLogicalType(type)] ?? []),
];

const readNumbers = (values: readonly (PagePropertyValue | undefined)[]): readonly number[] =>
  values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

const sumOf = (numbers: readonly number[]): number => numbers.reduce((total, number) => total + number, 0);

const medianOf = (numbers: readonly number[]): number => {
  const sorted = [...numbers].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const isOdd = sorted.length % 2 === 1;
  return isOdd ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const countFilled = (type: PagePropertyType, values: readonly (PagePropertyValue | undefined)[]): number =>
  values.filter((value) => value !== undefined && !isPagePropertyValueEmpty(type, value)).length;

const overNumbers = (calculation: PageViewCalculation, numbers: readonly number[]): number | null => {
  if (numbers.length === 0) return null;
  switch (calculation) {
    case PAGE_VIEW_CALCULATION.SUM:
      return sumOf(numbers);
    case PAGE_VIEW_CALCULATION.AVERAGE:
      return sumOf(numbers) / numbers.length;
    case PAGE_VIEW_CALCULATION.MINIMUM:
      return Math.min(...numbers);
    case PAGE_VIEW_CALCULATION.MAXIMUM:
      return Math.max(...numbers);
    default:
      return medianOf(numbers);
  }
};

/**
 * Expects the rows the view let through, not the whole collection: a total that
 * ignores the active filter answers a question nobody asked.
 * Returns `null` when there is nothing to say, so the UI shows nothing instead
 * of a zero that reads as data.
 */
export const computePageCalculation = (
  calculation: PageViewCalculation,
  type: PagePropertyType,
  values: readonly (PagePropertyValue | undefined)[],
): number | null => {
  switch (calculation) {
    case PAGE_VIEW_CALCULATION.NONE:
      return null;
    case PAGE_VIEW_CALCULATION.COUNT_ALL:
      return values.length;
    case PAGE_VIEW_CALCULATION.COUNT_FILLED:
      return countFilled(type, values);
    case PAGE_VIEW_CALCULATION.COUNT_EMPTY:
      return values.length - countFilled(type, values);
    case PAGE_VIEW_CALCULATION.PERCENT_CHECKED:
      return values.length === 0 ? null : values.filter((value) => value === true).length / values.length;
    default:
      return overNumbers(calculation, readNumbers(values));
  }
};

export const isPageCalculationAPortion = (calculation: PageViewCalculation): boolean =>
  calculation === PAGE_VIEW_CALCULATION.PERCENT_CHECKED;
