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
 * Cuánto mide la barra de un grupo.
 *
 * Es la misma cuenta que una columna hace al pie de una tabla, mirada por otro
 * lado: ahí se pregunta por todas las filas juntas y aquí por las de un grupo.
 * Por eso no se vuelve a escribir la aritmética.
 *
 * Un grupo del que no hay nada que decir mide **cero y no nada**: el grupo
 * existe y tiene filas, y un hueco en el dibujo se leería como que no está.
 */
export const readPageChartValue = (
  measure: PageChartMeasure,
  type: PagePropertyType,
  values: readonly (PagePropertyValue | undefined)[],
): number => computePageCalculation(CALCULATION_BY_MEASURE[measure], type, values) ?? 0;

/**
 * Qué se puede medir.
 *
 * Contar filas se puede siempre, porque no pregunta por ninguna propiedad.
 * Sumar y promediar necesitan un número: sumar estados o promediar fechas no
 * quiere decir nada, así que no se ofrecen cuando no hay ninguno.
 */
export const listPageChartMeasuresFor = (hasANumber: boolean): readonly PageChartMeasure[] =>
  hasANumber
    ? [PAGE_CHART_MEASURE.COUNT, PAGE_CHART_MEASURE.SUM, PAGE_CHART_MEASURE.AVERAGE]
    : [PAGE_CHART_MEASURE.COUNT];
