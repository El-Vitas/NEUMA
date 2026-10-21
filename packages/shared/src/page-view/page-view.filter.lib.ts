import { MILLISECONDS_IN_A_DAY } from '../constants/time.constants.js';
import {
  getPageDateEndTime,
  getPageDateStartTime,
  readPageDateValue,
} from '../page-property/page-property.date.lib.js';
import {
  getPagePropertyLogicalType,
  isPagePropertyValueEmpty,
  readPagePropertyValue,
} from '../page-property/page-property.lib.js';
import { findPageOption } from '../page-property/page-property.option.lib.js';
import type {
  PagePropertyLogicalType,
  PagePropertyValue,
  PagePropertyValues,
} from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE } from '../page-property/page-property.types.js';
import { toValueList, toValueText } from '../page-property/page-property.value.lib.js';
import type { PageFilter, PageFilterCondition, PageFilterOperator, PageViewProperty } from './page-view.types.js';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_FILTER_OPERATOR } from './page-view.types.js';

type PageFilterPredicate = (
  value: PagePropertyValue,
  argument: PagePropertyValue,
  property: PageViewProperty,
) => boolean;

type PageFilterPredicates = Readonly<Partial<Record<PageFilterOperator, PageFilterPredicate>>>;

const toComparableText = (value: PagePropertyValue): string => (typeof value === 'string' ? value : toValueText(value));

const toLowerText = (value: PagePropertyValue): string => toComparableText(value).toLocaleLowerCase();

const areBothNumbers = (value: PagePropertyValue, argument: PagePropertyValue): boolean =>
  typeof value === 'number' && typeof argument === 'number';

const toEntries = toValueList;

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A day argument covers its whole day, so a creation instant matches the day it fell on. */
const readArgumentSpan = (argument: PagePropertyValue): { end: number; start: number } | null => {
  const start = Date.parse(toComparableText(argument));
  if (Number.isNaN(start)) return null;
  return { end: DAY_ONLY.test(toComparableText(argument)) ? start + MILLISECONDS_IN_A_DAY - 1 : start, start };
};

const compareDate = (
  value: PagePropertyValue,
  argument: PagePropertyValue,
  isMatch: (valueSpan: { end: number; start: number }, argumentSpan: { end: number; start: number }) => boolean,
): boolean => {
  const date = readPageDateValue(value);
  const argumentSpan = readArgumentSpan(argument);
  if (date === null || argumentSpan === null) return false;
  return isMatch({ end: getPageDateEndTime(date), start: getPageDateStartTime(date) }, argumentSpan);
};

const textPredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: (value, argument) => toComparableText(value) === toComparableText(argument),
  [PAGE_FILTER_OPERATOR.IS_NOT]: (value, argument) => toComparableText(value) !== toComparableText(argument),
  [PAGE_FILTER_OPERATOR.CONTAINS]: (value, argument) => toLowerText(value).includes(toLowerText(argument)),
  [PAGE_FILTER_OPERATOR.NOT_CONTAINS]: (value, argument) => !toLowerText(value).includes(toLowerText(argument)),
};

const tagPredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: (value, argument) => toComparableText(value) === toComparableText(argument),
  [PAGE_FILTER_OPERATOR.IS_NOT]: (value, argument) => toComparableText(value) !== toComparableText(argument),
};

const multiTagPredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.CONTAINS]: (value, argument) => toEntries(value).includes(toComparableText(argument)),
  [PAGE_FILTER_OPERATOR.NOT_CONTAINS]: (value, argument) => !toEntries(value).includes(toComparableText(argument)),
};

const isInGroup = (value: PagePropertyValue, argument: PagePropertyValue, property: PageViewProperty): boolean =>
  findPageOption(property.options ?? null, toComparableText(value))?.group === toComparableText(argument);

const statusPredicates: PageFilterPredicates = {
  ...tagPredicates,
  [PAGE_FILTER_OPERATOR.IS_IN_GROUP]: isInGroup,
  [PAGE_FILTER_OPERATOR.IS_NOT_IN_GROUP]: (value, argument, property) => !isInGroup(value, argument, property),
};

const numberPredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: (value, argument) => areBothNumbers(value, argument) && value === argument,
  [PAGE_FILTER_OPERATOR.IS_NOT]: (value, argument) => areBothNumbers(value, argument) && value !== argument,
  [PAGE_FILTER_OPERATOR.IS_GREATER_THAN]: (value, argument) => areBothNumbers(value, argument) && value > argument,
  [PAGE_FILTER_OPERATOR.IS_LESS_THAN]: (value, argument) => areBothNumbers(value, argument) && value < argument,
};

const booleanPredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: (value, argument) => value === argument,
};

/** A range is a match for a day when the two overlap; before and after use the end and the start of the range. */
const datePredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: (value, argument) =>
    compareDate(
      value,
      argument,
      (valueSpan, argumentSpan) => valueSpan.start <= argumentSpan.end && argumentSpan.start <= valueSpan.end,
    ),
  [PAGE_FILTER_OPERATOR.IS_BEFORE]: (value, argument) =>
    compareDate(value, argument, (valueSpan, argumentSpan) => valueSpan.end < argumentSpan.start),
  [PAGE_FILTER_OPERATOR.IS_AFTER]: (value, argument) =>
    compareDate(value, argument, (valueSpan, argumentSpan) => valueSpan.start > argumentSpan.end),
};

const noPredicates: PageFilterPredicates = {};

const PREDICATES_BY_LOGICAL_TYPE: Readonly<Record<PagePropertyLogicalType, PageFilterPredicates>> = {
  [PAGE_PROPERTY_LOGICAL_TYPE.TEXT]: textPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.NUMBER]: numberPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN]: booleanPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.DATE]: datePredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.TAG]: tagPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG]: multiTagPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.STATUS]: statusPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.RELATION]: multiTagPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.FILES]: noPredicates,
};

const EMPTINESS_OPERATORS = [PAGE_FILTER_OPERATOR.IS_EMPTY, PAGE_FILTER_OPERATOR.IS_NOT_EMPTY] as const;

const VALUE_OPERATORS_BY_LOGICAL_TYPE: Readonly<Record<PagePropertyLogicalType, readonly PageFilterOperator[]>> = {
  [PAGE_PROPERTY_LOGICAL_TYPE.TEXT]: [
    PAGE_FILTER_OPERATOR.IS,
    PAGE_FILTER_OPERATOR.IS_NOT,
    PAGE_FILTER_OPERATOR.CONTAINS,
    PAGE_FILTER_OPERATOR.NOT_CONTAINS,
  ],
  [PAGE_PROPERTY_LOGICAL_TYPE.NUMBER]: [
    PAGE_FILTER_OPERATOR.IS,
    PAGE_FILTER_OPERATOR.IS_NOT,
    PAGE_FILTER_OPERATOR.IS_GREATER_THAN,
    PAGE_FILTER_OPERATOR.IS_LESS_THAN,
  ],
  [PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN]: [PAGE_FILTER_OPERATOR.IS],
  [PAGE_PROPERTY_LOGICAL_TYPE.DATE]: [
    PAGE_FILTER_OPERATOR.IS,
    PAGE_FILTER_OPERATOR.IS_BEFORE,
    PAGE_FILTER_OPERATOR.IS_AFTER,
  ],
  [PAGE_PROPERTY_LOGICAL_TYPE.TAG]: [PAGE_FILTER_OPERATOR.IS, PAGE_FILTER_OPERATOR.IS_NOT],
  [PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG]: [PAGE_FILTER_OPERATOR.CONTAINS, PAGE_FILTER_OPERATOR.NOT_CONTAINS],
  [PAGE_PROPERTY_LOGICAL_TYPE.STATUS]: [
    PAGE_FILTER_OPERATOR.IS,
    PAGE_FILTER_OPERATOR.IS_NOT,
    PAGE_FILTER_OPERATOR.IS_IN_GROUP,
    PAGE_FILTER_OPERATOR.IS_NOT_IN_GROUP,
  ],
  [PAGE_PROPERTY_LOGICAL_TYPE.RELATION]: [PAGE_FILTER_OPERATOR.CONTAINS, PAGE_FILTER_OPERATOR.NOT_CONTAINS],
  [PAGE_PROPERTY_LOGICAL_TYPE.FILES]: [],
};

export const getPageFilterOperators = (logicalType: PagePropertyLogicalType): readonly PageFilterOperator[] => [
  ...VALUE_OPERATORS_BY_LOGICAL_TYPE[logicalType],
  ...EMPTINESS_OPERATORS,
];

export const hasPageFilterPredicate = (logicalType: PagePropertyLogicalType, operator: PageFilterOperator): boolean =>
  PREDICATES_BY_LOGICAL_TYPE[logicalType][operator] !== undefined;

const matchesEmptinessOperator = (operator: PageFilterOperator, isEmpty: boolean): boolean | null => {
  if (operator === PAGE_FILTER_OPERATOR.IS_EMPTY) return isEmpty;
  if (operator === PAGE_FILTER_OPERATOR.IS_NOT_EMPTY) return !isEmpty;
  return null;
};

const matchesCondition = (
  condition: PageFilterCondition,
  propertyValues: PagePropertyValues,
  properties: readonly PageViewProperty[],
): boolean => {
  const property = properties.find((candidate) => candidate.key === condition.propertyKey);
  if (property === undefined) return true;
  const value = readPagePropertyValue(propertyValues, condition.propertyKey);
  const emptinessResult = matchesEmptinessOperator(condition.operator, isPagePropertyValueEmpty(property.type, value));
  if (emptinessResult !== null) return emptinessResult;
  if (value === undefined || condition.value === null) return true;
  const predicate = PREDICATES_BY_LOGICAL_TYPE[getPagePropertyLogicalType(property.type)][condition.operator];
  return predicate === undefined ? true : predicate(value, condition.value, property);
};

export const matchesPageFilter = (
  filter: PageFilter,
  propertyValues: PagePropertyValues,
  properties: readonly PageViewProperty[],
): boolean => {
  if (filter.kind === 'CONDITION') return matchesCondition(filter, propertyValues, properties);
  if (filter.conditions.length === 0) return true;
  return filter.operator === PAGE_FILTER_GROUP_OPERATOR.AND
    ? filter.conditions.every((condition) => matchesPageFilter(condition, propertyValues, properties))
    : filter.conditions.some((condition) => matchesPageFilter(condition, propertyValues, properties));
};
