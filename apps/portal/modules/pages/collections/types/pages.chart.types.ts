import type { PageChartMeasure, PageGroupByMode, PageOptionColor } from '@neuma/shared';
import type { PageSchemaProperty, PageViewAggregates } from './pages.schema.types';

export interface ChartSeriesInput {
  readonly aggregates: PageViewAggregates;
  readonly groupBy: PageSchemaProperty | undefined;
  readonly measure: PageChartMeasure;
  readonly mode: PageGroupByMode;
  readonly statusGroupLabel: (group: string) => string;
  /** Property summed or averaged; null when the measure counts rows. */
  readonly valueProperty: null | string;
}

export interface PageChartPoint {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

/** Degrees. */
export interface PageChartSlice {
  readonly from: number;
  readonly sweep: number;
}
