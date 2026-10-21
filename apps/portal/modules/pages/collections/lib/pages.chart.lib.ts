import {
  PAGE_CHART_MEASURE,
  PAGE_PROPERTY_TYPE,
  PAGE_STATUS_GROUP_VALUES,
  PAGE_VIEW_CALCULATION,
  sortPageOptionsByGroup,
  UNASSIGNED_GROUP_KEY,
} from '@neuma/shared';
import { FULL_TURN, HALF_TURN, QUARTER_TURN } from '../constants/pages.chart.constants';
import type { ChartSeriesInput, PageChartPoint, PageChartSlice } from '../types/pages.chart.types';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import { toCalculationItemId } from './pages.query-aggregates.lib';
import { describeGroupKey } from './pages.query-outcome.lib';

/** The groups the database counted, in the order their property declares them and the one without a value last. */
const sortGroupKeys = (keys: readonly string[], property: PageSchemaProperty | undefined): readonly string[] => {
  const declared = [
    ...PAGE_STATUS_GROUP_VALUES,
    ...(property?.options === null || property === undefined
      ? []
      : (property.type === PAGE_PROPERTY_TYPE.STATUS ? sortPageOptionsByGroup(property.options) : property.options).map(
          (option) => option.id,
        )),
  ];
  const positionOf = (key: string): number => {
    if (key === UNASSIGNED_GROUP_KEY) return Number.MAX_SAFE_INTEGER;
    const position = declared.indexOf(key);
    return position === -1 ? Number.MAX_SAFE_INTEGER - 1 : position;
  };
  return [...keys].sort((left, right) => positionOf(left) - positionOf(right) || left.localeCompare(right));
};

/** Falls back to counting rows when nothing was calculated for the measured property: a flat chart says nothing. */
export const readChartSeries = ({
  aggregates,
  groupBy,
  measure,
  mode,
  statusGroupLabel,
  valueProperty,
}: ChartSeriesInput): readonly PageChartPoint[] =>
  sortGroupKeys(Object.keys(aggregates.groupCounts), groupBy).map((key) => {
    const described = describeGroupKey(groupBy, mode, key, statusGroupLabel);
    const usesCount = measure === PAGE_CHART_MEASURE.COUNT || valueProperty === null;
    const calculation = measure === PAGE_CHART_MEASURE.SUM ? PAGE_VIEW_CALCULATION.SUM : PAGE_VIEW_CALCULATION.AVERAGE;
    const calculated = usesCount
      ? null
      : aggregates.groupCalculations[key]?.[toCalculationItemId(valueProperty, calculation)];
    return {
      color: described.color,
      key,
      label: described.label,
      value: usesCount ? (aggregates.groupCounts[key] ?? 0) : (calculated ?? 0),
    };
  });

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
