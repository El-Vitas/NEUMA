import type { PageChartMeasure } from '@company-brain/shared';
import { PAGE_CHART_MEASURE, readPageChartValue } from '@company-brain/shared';
import { FULL_TURN, HALF_TURN, QUARTER_TURN } from '../constants/pages.chart.constants';
import type { PageChartPoint, PageChartSlice } from '../types/pages.chart.types';
import type { PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';

/** Falls back to counting rows when the measured property no longer exists, instead of drawing a flat chart. */
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

/** Never zero: dividing by it would produce NaN heights. */
export const readChartTopValue = (values: readonly number[]): number => Math.max(1, ...values);

/** A single value is centered; otherwise first and last values touch the left and right edges. */
export const readChartPointsPath = (values: readonly number[], top: number, width: number, height: number): string =>
  values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      return `${Math.round(x)},${Math.round(height - (value / top) * height)}`;
    })
    .join(' ');

/** Empty when the total is zero: a full circle split among zeros would give one group everything. */
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

/** A full-circle slice is drawn as two halves: an arc ending where it starts draws nothing. */
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
