import type { PagePropertyValue } from '../page-property/page-property.types.js';
import type { PageFilter, PageSortDirection, PageViewConfiguration } from './page-view.types.js';

/** ADR 025. A view is changed by operations that each touch one key or one element, never the whole configuration. */

export const PAGE_VIEW_SCALAR_KEYS = [
  'cardSize',
  'chartKind',
  'chartMeasure',
  'chartValueProperty',
  'coverProperty',
  'dateProperty',
  'dateScale',
  'endDateProperty',
  'frozenColumns',
  'groupBy',
  'groupByDateBucket',
  'groupByMode',
  'hidesEmptyGroups',
  'hidesUnassignedColumn',
  'icon',
  'rowHeight',
  'subGroupBy',
  'visibleProperties',
  'wrapsText',
] as const;

export type PageViewScalarKey = (typeof PAGE_VIEW_SCALAR_KEYS)[number];

export const PAGE_VIEW_MAP_KEYS = [
  'calculations',
  'columnAlignments',
  'columnLimits',
  'columnWidths',
  'columnWraps',
] as const;

export type PageViewMapKey = (typeof PAGE_VIEW_MAP_KEYS)[number];

/** `manualOrder` lives in its own column of the view, the rest in its configuration. */
export const PAGE_VIEW_LIST_KEYS = ['collapsedGroups', 'hiddenGroups', 'manualOrder', 'visibleProperties'] as const;

export const PAGE_VIEW_CONFIGURATION_LIST_KEYS = ['collapsedGroups', 'hiddenGroups', 'visibleProperties'] as const;

export type PageViewListKey = (typeof PAGE_VIEW_LIST_KEYS)[number];

export interface PageFilterNodePatch {
  readonly groupOperator?: 'AND' | 'OR' | undefined;
  readonly operator?: string | undefined;
  readonly propertyKey?: string | undefined;
  /** Null clears the value; leaving it out keeps the one the condition has. */
  readonly value?: PagePropertyValue | null | undefined;
}

export type PageViewOperation =
  | {
      readonly after?: string | undefined;
      readonly command: 'listAfter';
      readonly id: string;
      readonly list: PageViewListKey;
    }
  | {
      readonly before?: string | undefined;
      readonly command: 'listBefore';
      readonly id: string;
      readonly list: PageViewListKey;
    }
  | { readonly command: 'listRemove'; readonly id: string; readonly list: PageViewListKey }
  | { readonly command: 'set'; readonly key: PageViewScalarKey; readonly value: unknown }
  | { readonly command: 'setEntry'; readonly key: string; readonly map: PageViewMapKey; readonly value: unknown }
  | { readonly command: 'removeEntry'; readonly key: string; readonly map: PageViewMapKey }
  | {
      readonly after?: string | undefined;
      readonly command: 'sortSet';
      readonly direction: PageSortDirection;
      readonly propertyKey: string;
    }
  | { readonly command: 'sortRemove'; readonly propertyKey: string }
  | {
      readonly after?: string | undefined;
      readonly command: 'filterInsert';
      readonly node: PageFilter;
      readonly parentId?: string | undefined;
    }
  | { readonly command: 'filterUpdate'; readonly id: string; readonly patch: PageFilterNodePatch }
  | { readonly command: 'filterRemove'; readonly id: string };

/** What an operation reads and writes: the configuration and the manual order, both as the view row stores them. */
export interface PageViewState {
  readonly configuration: PageViewConfiguration;
  /** Null follows the order of the collection. */
  readonly manualOrder: readonly string[] | null;
}

/** What a list needs to start from when it is still the default: all properties, or the order of the collection. */
export interface PageViewOperationContext {
  /** The rows of the collection in its own order, for the first time a view orders by hand. */
  readonly collectionOrder: readonly string[];
  readonly createId: () => string;
  /** The properties of the collection in order, for the first time a view lists its visible ones by hand. */
  readonly propertyKeys: readonly string[];
}

export const PAGE_VIEW_MANUAL_ORDER_MAXIMUM = 20_000;

export type PageViewOperationErrorCode = 'INVALID' | 'MANUAL_ORDER_TOO_LONG' | 'NOT_FOUND';

export interface PageViewOperationError {
  readonly code: PageViewOperationErrorCode;
  readonly message: string;
}
