import type { PagePropertyValue } from '../page-property/page-property.types.js';
import type { PagePropertyType } from '../types/page-schema.types.js';

export type PageFilterOperator =
  | 'IS'
  | 'IS_NOT'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY'
  | 'IS_GREATER_THAN'
  | 'IS_LESS_THAN'
  | 'IS_BEFORE'
  | 'IS_AFTER';

export const PAGE_FILTER_OPERATOR = {
  IS: 'IS',
  IS_NOT: 'IS_NOT',
  CONTAINS: 'CONTAINS',
  NOT_CONTAINS: 'NOT_CONTAINS',
  IS_EMPTY: 'IS_EMPTY',
  IS_NOT_EMPTY: 'IS_NOT_EMPTY',
  IS_GREATER_THAN: 'IS_GREATER_THAN',
  IS_LESS_THAN: 'IS_LESS_THAN',
  IS_BEFORE: 'IS_BEFORE',
  IS_AFTER: 'IS_AFTER',
} as const satisfies Record<PageFilterOperator, PageFilterOperator>;

export const PAGE_FILTER_OPERATOR_VALUES = [
  PAGE_FILTER_OPERATOR.IS,
  PAGE_FILTER_OPERATOR.IS_NOT,
  PAGE_FILTER_OPERATOR.CONTAINS,
  PAGE_FILTER_OPERATOR.NOT_CONTAINS,
  PAGE_FILTER_OPERATOR.IS_EMPTY,
  PAGE_FILTER_OPERATOR.IS_NOT_EMPTY,
  PAGE_FILTER_OPERATOR.IS_GREATER_THAN,
  PAGE_FILTER_OPERATOR.IS_LESS_THAN,
  PAGE_FILTER_OPERATOR.IS_BEFORE,
  PAGE_FILTER_OPERATOR.IS_AFTER,
] as const;

export type PageFilterGroupOperator = 'AND' | 'OR';

export const PAGE_FILTER_GROUP_OPERATOR = {
  AND: 'AND',
  OR: 'OR',
} as const satisfies Record<PageFilterGroupOperator, PageFilterGroupOperator>;

export interface PageFilterCondition {
  readonly kind: 'CONDITION';
  readonly propertyKey: string;
  readonly operator: PageFilterOperator;
  readonly value: PagePropertyValue | null;
}

export interface PageFilterGroup {
  readonly kind: 'GROUP';
  readonly operator: PageFilterGroupOperator;
  readonly conditions: readonly PageFilter[];
}

export type PageFilter = PageFilterCondition | PageFilterGroup;

/** A condition is one level, a group two, a nested group three; deeper filters cannot be explained in a sentence. */
export const PAGE_FILTER_MAXIMUM_DEPTH = 3;

export type PageSortDirection = 'ASCENDING' | 'DESCENDING';

export const PAGE_SORT_DIRECTION = {
  ASCENDING: 'ASCENDING',
  DESCENDING: 'DESCENDING',
} as const satisfies Record<PageSortDirection, PageSortDirection>;

export const PAGE_SORT_DIRECTION_VALUES = [PAGE_SORT_DIRECTION.ASCENDING, PAGE_SORT_DIRECTION.DESCENDING] as const;

export interface PageSort {
  readonly propertyKey: string;
  readonly direction: PageSortDirection;
}

/** Counting fits any column; the rest depends on the property type (percent checked only for checkboxes). */
export type PageViewCalculation =
  | 'NONE'
  | 'COUNT_ALL'
  | 'COUNT_EMPTY'
  | 'COUNT_FILLED'
  | 'SUM'
  | 'AVERAGE'
  | 'MINIMUM'
  | 'MAXIMUM'
  | 'MEDIAN'
  | 'PERCENT_CHECKED';

export const PAGE_VIEW_CALCULATION = {
  NONE: 'NONE',
  COUNT_ALL: 'COUNT_ALL',
  COUNT_EMPTY: 'COUNT_EMPTY',
  COUNT_FILLED: 'COUNT_FILLED',
  SUM: 'SUM',
  AVERAGE: 'AVERAGE',
  MINIMUM: 'MINIMUM',
  MAXIMUM: 'MAXIMUM',
  MEDIAN: 'MEDIAN',
  PERCENT_CHECKED: 'PERCENT_CHECKED',
} as const satisfies Record<PageViewCalculation, PageViewCalculation>;

export const PAGE_VIEW_CALCULATION_VALUES = [
  PAGE_VIEW_CALCULATION.NONE,
  PAGE_VIEW_CALCULATION.COUNT_ALL,
  PAGE_VIEW_CALCULATION.COUNT_EMPTY,
  PAGE_VIEW_CALCULATION.COUNT_FILLED,
  PAGE_VIEW_CALCULATION.SUM,
  PAGE_VIEW_CALCULATION.AVERAGE,
  PAGE_VIEW_CALCULATION.MINIMUM,
  PAGE_VIEW_CALCULATION.MAXIMUM,
  PAGE_VIEW_CALCULATION.MEDIAN,
  PAGE_VIEW_CALCULATION.PERCENT_CHECKED,
] as const;

/** Without a bucket, each distinct day is its own group: a year of work becomes hundreds of one-row groups. */
export type PageDateBucket = 'DAY' | 'WEEK' | 'MONTH';

export const PAGE_DATE_BUCKET = {
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
} as const satisfies Record<PageDateBucket, PageDateBucket>;

export const PAGE_DATE_BUCKET_VALUES = [PAGE_DATE_BUCKET.DAY, PAGE_DATE_BUCKET.WEEK, PAGE_DATE_BUCKET.MONTH] as const;

export type PageRowHeight = 'SHORT' | 'MEDIUM' | 'TALL';

export const PAGE_ROW_HEIGHT = {
  SHORT: 'SHORT',
  MEDIUM: 'MEDIUM',
  TALL: 'TALL',
} as const satisfies Record<PageRowHeight, PageRowHeight>;

export const PAGE_ROW_HEIGHT_VALUES = [PAGE_ROW_HEIGHT.SHORT, PAGE_ROW_HEIGHT.MEDIUM, PAGE_ROW_HEIGHT.TALL] as const;

export type PageChartKind = 'BAR' | 'LINE' | 'PIE';

export const PAGE_CHART_KIND = {
  BAR: 'BAR',
  LINE: 'LINE',
  PIE: 'PIE',
} as const satisfies Record<PageChartKind, PageChartKind>;

export const PAGE_CHART_KIND_VALUES = [PAGE_CHART_KIND.BAR, PAGE_CHART_KIND.LINE, PAGE_CHART_KIND.PIE] as const;

export type PageChartMeasure = 'COUNT' | 'SUM' | 'AVERAGE';

export const PAGE_CHART_MEASURE = {
  COUNT: 'COUNT',
  SUM: 'SUM',
  AVERAGE: 'AVERAGE',
} as const satisfies Record<PageChartMeasure, PageChartMeasure>;

export const PAGE_CHART_MEASURE_VALUES = [
  PAGE_CHART_MEASURE.COUNT,
  PAGE_CHART_MEASURE.SUM,
  PAGE_CHART_MEASURE.AVERAGE,
] as const;

export type PageColumnAlignment = 'START' | 'CENTER' | 'END';

export const PAGE_COLUMN_ALIGNMENT = {
  START: 'START',
  CENTER: 'CENTER',
  END: 'END',
} as const satisfies Record<PageColumnAlignment, PageColumnAlignment>;

export const PAGE_COLUMN_ALIGNMENT_VALUES = [
  PAGE_COLUMN_ALIGNMENT.START,
  PAGE_COLUMN_ALIGNMENT.CENTER,
  PAGE_COLUMN_ALIGNMENT.END,
] as const;

export interface PageCalendarDay {
  readonly date: string;
  readonly isOfTheMonth: boolean;
}

export interface PageViewProperty {
  readonly key: string;
  readonly type: PagePropertyType;
}

export interface PageViewConfiguration {
  /** Emoji shown on the view's tab; per view, not per collection. */
  readonly icon: string | null;
  readonly groupBy: string | null;
  /** Crosses `groupBy`: with both set, rows form a grid where each crossing is a drop target. */
  readonly subGroupBy: string | null;
  /** Ignored when grouping by a non-date property. */
  readonly groupByDateBucket: PageDateBucket;
  /** Separate from `groupBy`: it places each row on its day, and a collection may hold several date properties. */
  readonly dateProperty: string | null;
  readonly filter: PageFilter | null;
  readonly sorts: readonly PageSort[];
  /** Null means all properties, in collection order; an empty list means show none. */
  readonly visibleProperties: readonly string[] | null;
  /** Footer calculation per column, keyed by property key. */
  readonly calculations: Readonly<Record<string, PageViewCalculation>>;
  /** Collapsed group values; per view, because collapsing is only a way of looking and says nothing about the data. */
  readonly collapsedGroups: readonly string[];
  /** Expected cards per column, keyed by column value. */
  readonly columnLimits: Readonly<Record<string, number>>;
  /** Pixels, keyed by property key. */
  readonly columnWidths: Readonly<Record<string, number>>;
  /** Leftmost columns that stay put on horizontal scroll, counting the name column first. */
  readonly frozenColumns: number;
  /** Per view: an empty group still exists as a value. On a board hiding it removes a drop target, so it is opt-in. */
  readonly hidesEmptyGroups: boolean;
  readonly hidesUnassignedColumn: boolean;
  readonly rowHeight: PageRowHeight;
  /** Pairs with `rowHeight`: wrapped text inside a row that does not grow is cut off. */
  readonly wrapsText: boolean;
  readonly columnAlignments: Readonly<Record<string, PageColumnAlignment>>;
  readonly chartKind: PageChartKind;
  readonly chartMeasure: PageChartMeasure;
  /** Null when the measure is a row count, which needs no property. */
  readonly chartValueProperty: string | null;
}
