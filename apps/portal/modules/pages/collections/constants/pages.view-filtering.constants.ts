import type { PageFilterGroup, PageFilterOperator } from '@neuma/shared';
import { PAGE_FILTER_GROUP_OPERATOR } from '@neuma/shared';

/** Operators that take no value: a condition using one drops any value it had. */
export const PAGE_FILTER_OPERATORS_WITHOUT_VALUE: readonly PageFilterOperator[] = ['IS_EMPTY', 'IS_NOT_EMPTY'];

export const EMPTY_PAGE_FILTER_GROUP: PageFilterGroup = {
  conditions: [],
  kind: 'GROUP',
  operator: PAGE_FILTER_GROUP_OPERATOR.AND,
};

export const PAGE_NESTED_FILTER_GROUP_LEVELS = 2;
