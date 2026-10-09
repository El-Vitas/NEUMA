import type { PagePropertyType } from '../types/page-schema.types.js';
import type { PagePropertyValue } from '../page-property/page-property.types.js';
import { computePageCalculation } from './page-view.calculation.lib.js';
import type { PageChartMeasure } from './page-view.types.js';
import { PAGE_CHART_MEASURE, PAGE_VIEW_CALCULATION } from './page-view.types.js';

const CALCULATION_BY_MEASURE = {
  [PAGE_CHART_MEASURE.COUNT]: PAGE_VIEW_CALCULATION.COUNT_ALL,
  [PAGE_CHART_MEASURE.SUM]: PAGE_VIEW_CALCULATION.SUM,
  [PAGE_CHART_MEASURE.AVERAGE]: PAGE_VIEW_CALCULATION.AVERAGE,
} as const satisfies Record<PageChartMeasure, string>;

/**
 * Reuses the table footer calculation, applied per group. A group with nothing to
 * measure is zero, not absent: the group exists, and a gap would read as missing.
 */
export const readPageChartValue = (
  measure: PageChartMeasure,
  type: PagePropertyType,
  values: readonly (PagePropertyValue | undefined)[],
): number => computePageCalculation(CALCULATION_BY_MEASURE[measure], type, values) ?? 0;

/** Counting always works; sum and average need a numeric property. */
export const listPageChartMeasuresFor = (hasANumber: boolean): readonly PageChartMeasure[] =>
  hasANumber
    ? [PAGE_CHART_MEASURE.COUNT, PAGE_CHART_MEASURE.SUM, PAGE_CHART_MEASURE.AVERAGE]
    : [PAGE_CHART_MEASURE.COUNT];
