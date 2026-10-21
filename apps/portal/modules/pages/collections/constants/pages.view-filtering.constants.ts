import type { PageFilterGroup, PageFilterOperator, PagePropertyType } from '@neuma/shared';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_FILTER_OPERATOR, PAGE_PROPERTY_TYPE } from '@neuma/shared';

/** Operators that take no value: a condition using one drops any value it had. */
export const PAGE_FILTER_OPERATORS_WITHOUT_VALUE: readonly PageFilterOperator[] = ['IS_EMPTY', 'IS_NOT_EMPTY'];

/** Operators that compare the group of a status instead of the status itself. */
export const PAGE_FILTER_GROUP_OPERATORS: readonly PageFilterOperator[] = [
  PAGE_FILTER_OPERATOR.IS_IN_GROUP,
  PAGE_FILTER_OPERATOR.IS_NOT_IN_GROUP,
];

/** Properties whose value is a member of the space, which a filter names from the member list. */
export const PAGE_FILTER_PERSON_PROPERTY_TYPES: readonly PagePropertyType[] = [
  PAGE_PROPERTY_TYPE.PERSON,
  PAGE_PROPERTY_TYPE.CREATED_BY,
  PAGE_PROPERTY_TYPE.EDITED_BY,
];

export const EMPTY_PAGE_FILTER_GROUP: PageFilterGroup = {
  conditions: [],
  kind: 'GROUP',
  operator: PAGE_FILTER_GROUP_OPERATOR.AND,
};

export const PAGE_NESTED_FILTER_GROUP_LEVELS = 2;
