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

export interface PageViewProperty {
  readonly key: string;
  readonly type: PagePropertyType;
}

export interface PageViewConfiguration {
  readonly groupBy: string | null;
  readonly filter: PageFilter | null;
  readonly sorts: readonly PageSort[];
}
