import type { PageChartMeasure } from '@company-brain/shared';
import { PAGE_CHART_MEASURE, readPageChartValue } from '@company-brain/shared';
import { FULL_TURN, HALF_TURN, QUARTER_TURN } from '../constants/pages.chart.constants';
import type { PageChartPoint, PageChartSlice } from '../types/pages.chart.types';
import type { PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';

/**
 * Lo que dice cada grupo, listo para dibujar.
 *
 * Un gráfico no lee filas: lee grupos, y de cada uno se queda con una sola
 * cuenta. Por eso agrupar es lo mismo que elegir el eje, y no hay dos maneras
 * de repartir las filas conviviendo en el producto.
 *
 * Sumar o promediar necesitan la propiedad elegida; si ya no existe —la
 * quitaron de la colección— se cuentan las filas, que es lo único que siempre
 * se puede hacer, en vez de dibujar un gráfico plano sin decir por qué.
 */
export const readChartSeries = (
  groups: readonly PageViewGroup[],
  measure: PageChartMeasure,
  valueProperty: null | string,
  properties: readonly PageSchemaProperty[],
): readonly PageChartPoint[] => {
  const measured = properties.find((property) => property.key === valueProperty);
  const usable = measured === undefined ? PAGE_CHART_MEASURE.COUNT : measure;
  return groups.map((group) => ({
    color: group.color,
    key: group.key,
    label: group.label,
    value: readPageChartValue(
      usable,
      measured?.type ?? 'NUMBER',
      group.rows.map((row) => (measured === undefined ? undefined : row.propertyValues?.[measured.key])),
    ),
  }));
};

/**
 * Hasta dónde llega el eje.
 *
 * Nunca es cero: un eje que llega a cero no deja dibujar nada, y dividir por él
 * daría una altura que no es un número.
 */
export const readChartTopValue = (values: readonly number[]): number => Math.max(1, ...values);

/**
 * La línea, como la lista de puntos que el dibujo entiende.
 *
 * El primer valor va pegado a la izquierda y el último a la derecha, así que un
 * valor solo iría pegado al borde sin nada al lado: ese se pone en el medio.
 */
export const readChartPointsPath = (values: readonly number[], top: number, width: number, height: number): string =>
  values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      return `${Math.round(x)},${Math.round(height - (value / top) * height)}`;
    })
    .join(' ');

/**
 * Qué parte de la vuelta se lleva cada grupo.
 *
 * Sin nada que repartir no hay porciones: un círculo entero repartido entre
 * ceros diría que alguno se lo lleva todo.
 */
export const readChartSlices = (values: readonly number[]): readonly PageChartSlice[] => {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];
  let from = 0;
  return values.map((value) => {
    const sweep = (value / total) * FULL_TURN;
    const slice = { from, sweep };
    from += sweep;
    return slice;
  });
};

const readPointOnCircle = (degrees: number, radius: number): string => {
  const radians = ((degrees - QUARTER_TURN) * Math.PI) / HALF_TURN;
  return `${(radius + radius * Math.cos(radians)).toFixed(2)},${(radius + radius * Math.sin(radians)).toFixed(2)}`;
};

/**
 * El contorno de una porción: del centro al borde, el arco, y de vuelta.
 *
 * Una porción que se lleva la vuelta entera se dibuja como dos medias, porque
 * un arco que termina donde empieza no dibuja nada.
 */
export const describePieSlicePath = (slice: PageChartSlice, radius: number): string => {
  const to = slice.from + Math.min(slice.sweep, FULL_TURN - 0.01);
  const half = slice.from + (to - slice.from) / 2;
  const isWide = to - slice.from > HALF_TURN ? 1 : 0;
  return [
    `M ${radius},${radius}`,
    `L ${readPointOnCircle(slice.from, radius)}`,
    `A ${radius},${radius} 0 0 1 ${readPointOnCircle(half, radius)}`,
    `A ${radius},${radius} 0 ${isWide} 1 ${readPointOnCircle(to, radius)}`,
    'Z',
  ].join(' ');
};
