import {
  getPagePropertyLogicalType,
  isPagePropertyValueEmpty,
  readPagePropertyValue,
} from '../page-property/page-property.lib.js';
import type {
  PagePropertyLogicalType,
  PagePropertyValue,
  PagePropertyValues,
} from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE } from '../page-property/page-property.types.js';
import type { PageFilter, PageFilterCondition, PageFilterOperator, PageViewProperty } from './page-view.types.js';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_FILTER_OPERATOR } from './page-view.types.js';

type PageFilterPredicate = (value: PagePropertyValue, argument: PagePropertyValue) => boolean;

type PageFilterPredicates = Readonly<Partial<Record<PageFilterOperator, PageFilterPredicate>>>;

const toComparableText = (value: PagePropertyValue): string => (typeof value === 'string' ? value : String(value));

const toLowerText = (value: PagePropertyValue): string => toComparableText(value).toLocaleLowerCase();

const toComparableTime = (value: PagePropertyValue): number => Date.parse(toComparableText(value));

const hasComparableTimes = (value: PagePropertyValue, argument: PagePropertyValue): boolean =>
  !Number.isNaN(toComparableTime(value)) && !Number.isNaN(toComparableTime(argument));

const areBothNumbers = (value: PagePropertyValue, argument: PagePropertyValue): boolean =>
  typeof value === 'number' && typeof argument === 'number';

const isStringArray = (value: PagePropertyValue): value is readonly string[] => Array.isArray(value);

const toEntries = (value: PagePropertyValue): readonly string[] => (isStringArray(value) ? value : []);

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

const numberPredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: (value, argument) => areBothNumbers(value, argument) && value === argument,
  [PAGE_FILTER_OPERATOR.IS_NOT]: (value, argument) => areBothNumbers(value, argument) && value !== argument,
  [PAGE_FILTER_OPERATOR.IS_GREATER_THAN]: (value, argument) => areBothNumbers(value, argument) && value > argument,
  [PAGE_FILTER_OPERATOR.IS_LESS_THAN]: (value, argument) => areBothNumbers(value, argument) && value < argument,
};

const booleanPredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: (value, argument) => value === argument,
};

const datePredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: (value, argument) =>
    hasComparableTimes(value, argument) && toComparableTime(value) === toComparableTime(argument),
  [PAGE_FILTER_OPERATOR.IS_BEFORE]: (value, argument) =>
    hasComparableTimes(value, argument) && toComparableTime(value) < toComparableTime(argument),
  [PAGE_FILTER_OPERATOR.IS_AFTER]: (value, argument) =>
    hasComparableTimes(value, argument) && toComparableTime(value) > toComparableTime(argument),
};

const PREDICATES_BY_LOGICAL_TYPE: Readonly<Record<PagePropertyLogicalType, PageFilterPredicates>> = {
  [PAGE_PROPERTY_LOGICAL_TYPE.TEXT]: textPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.NUMBER]: numberPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN]: booleanPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.DATE]: datePredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.TAG]: tagPredicates,
  [PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG]: multiTagPredicates,
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
  return predicate === undefined ? true : predicate(value, condition.value);
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
