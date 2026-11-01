import { getPagePropertyLogicalType } from '../page-property/page-property.lib.js';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE } from '../page-property/page-property.types.js';
import { computePageCalculation, listPageCalculationsFor } from '../page-view/page-view.calculation.lib.js';
import { PAGE_VIEW_CALCULATION } from '../page-view/page-view.types.js';
import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_FORMULA_RUNTIME_ERROR, PAGE_FORMULA_TYPE } from './page-formula.constants.js';
import { failWith, succeedWith } from './page-formula.outcome.lib.js';
import {
  isPageComputedPropertyType,
  readPageComputedEffectiveType,
  readPageFormulaStoredValue,
} from './page-formula.property.lib.js';
import type {
  PageFormulaOutcome,
  PageFormulaPropertyInfo,
  PageFormulaScalar,
  PageFormulaType,
  PageFormulaValue,
  PageRollupCalculation,
} from './page-formula.types.js';

export const PAGE_ROLLUP_SHOW_ORIGINAL = 'SHOW_ORIGINAL';

/** A cell shows the originals up to this many, so a rollup never carries an unbounded list. */
const SHOW_ORIGINAL_MAX_ENTRIES = 1000;

/** Earliest and latest are the "minimum" and "maximum" of a date, which a footer does not offer. */
const DATE_EXTREMES: readonly PageRollupCalculation[] = [PAGE_VIEW_CALCULATION.MINIMUM, PAGE_VIEW_CALCULATION.MAXIMUM];

const isDateType = (type: PagePropertyType): boolean =>
  getPagePropertyLogicalType(type) === PAGE_PROPERTY_LOGICAL_TYPE.DATE;

/** The calculations a rollup can run over a property of this type (given as the type the engine sees). */
export const listPageRollupCalculationsFor = (targetType: PagePropertyType): readonly PageRollupCalculation[] => [
  ...listPageCalculationsFor(targetType).filter((calculation) => calculation !== PAGE_VIEW_CALCULATION.NONE),
  ...(isDateType(targetType) ? DATE_EXTREMES : []),
  PAGE_ROLLUP_SHOW_ORIGINAL,
];

export const readPageRollupResultType = (
  calculation: PageRollupCalculation,
  targetType: PagePropertyType,
): PageFormulaType => {
  if (calculation === PAGE_ROLLUP_SHOW_ORIGINAL) return PAGE_FORMULA_TYPE.LIST;
  const isExtreme = DATE_EXTREMES.includes(calculation);
  return isExtreme && isDateType(targetType) ? PAGE_FORMULA_TYPE.DATE : PAGE_FORMULA_TYPE.NUMBER;
};

/** The type the engine reads the target as: a computed property is read as the type of its result. */
export const readPageRollupTargetType = (target: PageFormulaPropertyInfo): PagePropertyType =>
  isPageComputedPropertyType(target.type) ? readPageComputedEffectiveType(target.resultType) : target.type;

const pickDateExtreme = (
  calculation: PageRollupCalculation,
  values: readonly (PagePropertyValue | undefined)[],
): PageFormulaOutcome => {
  const starts = values.flatMap((value) =>
    typeof value === 'object' && !Array.isArray(value) && 'start' in value ? [value.start] : [],
  );
  if (starts.length === 0) return succeedWith(null);
  const ordered = [...starts].sort((left, right) => Date.parse(left) - Date.parse(right));
  const picked = calculation === PAGE_VIEW_CALCULATION.MINIMUM ? ordered[0] : ordered[ordered.length - 1];
  return succeedWith({ start: picked });
};

const isScalarList = (value: PageFormulaValue): value is readonly PageFormulaScalar[] => Array.isArray(value);

const showOriginals = (
  target: PageFormulaPropertyInfo,
  values: readonly (PagePropertyValue | undefined)[],
): PageFormulaOutcome => {
  const originals: PageFormulaScalar[] = [];
  for (const stored of values) {
    const value = readPageFormulaStoredValue(target, stored);
    if (value === null) continue;
    originals.push(...(isScalarList(value) ? value : [value]));
  }
  return succeedWith(originals.slice(0, SHOW_ORIGINAL_MAX_ENTRIES));
};

export interface PageRollupInput {
  readonly calculation: PageRollupCalculation;
  readonly target: PageFormulaPropertyInfo;
  /** The target property's value in each related row the reader can see; a missing one is `undefined`. */
  readonly values: readonly (PagePropertyValue | undefined)[];
}

/** One rollup cell. With no related rows a count and a sum are zero and every other answer is empty. */
export const computePageRollup = ({ calculation, target, values }: PageRollupInput): PageFormulaOutcome => {
  const targetType = readPageRollupTargetType(target);
  if (!listPageRollupCalculationsFor(targetType).includes(calculation)) {
    return failWith(
      PAGE_FORMULA_RUNTIME_ERROR.ROLLUP_TARGET_UNAVAILABLE,
      `${calculation} cannot be calculated over a ${targetType} property`,
    );
  }
  if (calculation === PAGE_ROLLUP_SHOW_ORIGINAL) return showOriginals(target, values);
  if (isDateType(targetType) && DATE_EXTREMES.includes(calculation)) return pickDateExtreme(calculation, values);
  if (calculation === PAGE_VIEW_CALCULATION.SUM && values.length === 0) return succeedWith(0);
  return succeedWith(computePageCalculation(calculation, targetType, values));
};
