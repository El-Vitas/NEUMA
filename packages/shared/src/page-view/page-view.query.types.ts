import type { PageFormulaCellError } from '../page-formula/page-formula.types.js';
import type { PagePropertyValues } from '../page-property/page-property.types.js';
import type { PageFilter, PageSort, PageViewCalculation } from './page-view.types.js';

/** ADR 025. The request names a view and the reducers it wants; the server compiles the rest from the stored view. */

export type PageQueryReducerKind = 'results' | 'groups' | 'groupResults' | 'aggregations';

export const PAGE_QUERY_REDUCER_KIND = {
  aggregations: 'aggregations',
  groupResults: 'groupResults',
  groups: 'groups',
  results: 'results',
} as const satisfies Record<PageQueryReducerKind, PageQueryReducerKind>;

/** One column of a board, or one cell when the board also has subgroups. */
export interface PageQueryGroupAddress {
  readonly key: string;
  readonly subKey?: string | undefined;
}

export interface PageQueryResultsReducer {
  readonly cursor?: string | undefined;
  readonly id: string;
  readonly kind: 'results';
  readonly limit?: number | undefined;
}

export interface PageQueryGroupsReducer {
  /** Replaces the grouping of the view for this call only. */
  readonly groupBy?: string | undefined;
  readonly groupLimit?: number | undefined;
  readonly id: string;
  readonly includeHidden?: boolean | undefined;
  readonly kind: 'groups';
  readonly rowsPerGroup?: number | undefined;
  readonly subGroupBy?: string | undefined;
}

export interface PageQueryGroupResultsReducer {
  readonly cursor?: string | undefined;
  readonly group: PageQueryGroupAddress;
  /** Replaces the grouping of the view for this call only; the group names a value of it. */
  readonly groupBy?: string | undefined;
  readonly id: string;
  readonly kind: 'groupResults';
  readonly limit?: number | undefined;
  readonly subGroupBy?: string | undefined;
}

export type PageQueryAggregationBy = 'NONE' | 'GROUP';

export interface PageQueryAggregationItem {
  readonly calculation: PageViewCalculation;
  readonly id: string;
  /** Null counts rows and needs no property. */
  readonly propertyKey: string | null;
}

export interface PageQueryAggregationsReducer {
  readonly by: PageQueryAggregationBy;
  /** With `by: GROUP`, the grouping to aggregate over; the view's when absent. */
  readonly groupBy?: string | undefined;
  readonly id: string;
  readonly items: readonly PageQueryAggregationItem[];
  readonly kind: 'aggregations';
  readonly subGroupBy?: string | undefined;
}

export type PageQueryReducer =
  | PageQueryAggregationsReducer
  | PageQueryGroupResultsReducer
  | PageQueryGroupsReducer
  | PageQueryResultsReducer;

export interface PageQueryRequest {
  readonly quickFilter?: PageFilter | undefined;
  readonly reducers: readonly PageQueryReducer[];
  readonly search?: string | undefined;
  readonly sorts?: readonly PageSort[] | undefined;
  readonly timeZone?: string | undefined;
  readonly viewId?: string | undefined;
}

export interface PageQueryResultsOutcome {
  readonly ids: readonly string[];
  readonly kind: 'results';
  readonly nextCursor: null | string;
}

export interface PageQueryGroupOutcome {
  readonly ids: readonly string[];
  readonly isHidden: boolean;
  readonly key: string;
  readonly nextCursor: null | string;
  readonly subKey: null | string;
}

export interface PageQueryGroupsOutcome {
  readonly groups: readonly PageQueryGroupOutcome[];
  readonly hasMoreGroups: boolean;
  readonly kind: 'groups';
}

export type PageQueryAggregateValue = null | number | string;

export interface PageQueryAggregationGroupOutcome {
  readonly key: string;
  readonly subKey: null | string;
  readonly values: Readonly<Record<string, PageQueryAggregateValue>>;
}

export interface PageQueryAggregationsOutcome {
  /** Rows counted once even when a multi-value grouping repeats them in several groups. */
  readonly distinctRowCount: number;
  /**
   * By item id, for the items over a formula or rollup column whose cells failed: how many, among the rows evaluated.
   * A cell that failed totals as empty.
   */
  readonly errorCounts?: Readonly<Record<string, number>>;
  readonly groups: readonly PageQueryAggregationGroupOutcome[];
  readonly kind: 'aggregations';
  readonly totals: Readonly<Record<string, PageQueryAggregateValue>>;
}

export type PageQueryOutcome = PageQueryAggregationsOutcome | PageQueryGroupsOutcome | PageQueryResultsOutcome;

export interface PageQueryRow {
  /** The formulas and rollups of the row that could not be computed, with why. Their values are not in the row. */
  readonly computedErrors?: Readonly<Record<string, PageFormulaCellError>> | undefined;
  readonly createdAt: string;
  readonly createdById: string;
  readonly editedAt: string;
  readonly editedById: string;
  readonly id: string;
  readonly parentId: null | string;
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
  /** The version of the row's block; a copy with a lower one is stale. */
  readonly version: number;
}

export interface PageQueryFile {
  readonly id: string;
  readonly mimeType: string;
  readonly name: string;
  readonly size: number;
}

export interface PageQueryResponse {
  readonly attachedFiles: readonly PageQueryFile[];
  readonly reducers: Readonly<Record<string, PageQueryOutcome>>;
  readonly relatedRows: readonly { readonly id: string; readonly title: string }[];
  readonly rows: Readonly<Record<string, PageQueryRow>>;
  readonly spaceId: string;
  readonly viewVersion: number | null;
  /** Collections the formulas and rollups read besides this one. A change in any can change a value here. */
  readonly computedDependsOn: readonly string[];
}

export const PAGE_QUERY_LIMITS = {
  defaultGroupLimit: 100,
  defaultResultsLimit: 50,
  defaultRowsPerGroup: 25,
  /** A `results` page may carry as many ids as a response does: the browser reads a small collection whole. */
  maximumFullResultsLimit: 1000,
  maximumGroupLimit: 100,
  maximumIdsPerResponse: 1000,
  maximumReducers: 12,
  maximumResultsLimit: 100,
  maximumRowsPerGroup: 50,
  maximumSearchLength: 200,
} as const;

export const PAGE_QUERY_ERROR_CODE = {
  computedTooLarge: 'VIEW_QUERY_COMPUTED_TOO_LARGE',
  cursorStale: 'VIEW_QUERY_CURSOR_STALE',
  invalid: 'VIEW_QUERY_INVALID',
  notFound: 'VIEW_NOT_FOUND',
  timeout: 'VIEW_QUERY_TIMEOUT',
  tooManyRestrictedRows: 'VIEW_QUERY_TOO_MANY_RESTRICTED_ROWS',
} as const;

export type PageQueryErrorCode = (typeof PAGE_QUERY_ERROR_CODE)[keyof typeof PAGE_QUERY_ERROR_CODE];
