import { readPageDateValue } from '../page-property/page-property.date.lib.js';
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
import { matchesPageDateOperator, readPageDateArgument } from './page-view.date-argument.lib.js';
import type { PageFilter, PageFilterCondition, PageFilterOperator, PageViewProperty } from './page-view.types.js';
import { PAGE_FILTER_GROUP_OPERATOR, PAGE_FILTER_OPERATOR } from './page-view.types.js';

/** Where the filter is read: dates and times are told apart by days in this zone. */
export interface PageFilterContext {
  readonly timeZone: string;
}

const UTC_FILTER_CONTEXT: PageFilterContext = { timeZone: 'UTC' };

type PageFilterPredicate = (
  value: PagePropertyValue,
  argument: PagePropertyValue,
  property: PageViewProperty,
  context: PageFilterContext,
) => boolean;

type PageFilterPredicates = Readonly<Partial<Record<PageFilterOperator, PageFilterPredicate>>>;

const toComparableText = (value: PagePropertyValue): string => (typeof value === 'string' ? value : toValueText(value));

const toLowerText = (value: PagePropertyValue): string => toComparableText(value).toLocaleLowerCase();

const areBothNumbers = (value: PagePropertyValue, argument: PagePropertyValue): boolean =>
  typeof value === 'number' && typeof argument === 'number';

const toEntries = toValueList;

const compareDate =
  (operator: PageFilterOperator): PageFilterPredicate =>
  (value, argument, _property, context) => {
    const date = readPageDateValue(value);
    const dateArgument = readPageDateArgument(argument, context.timeZone);
    if (date === null || dateArgument === null) return false;
    return matchesPageDateOperator(operator, date, dateArgument);
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

/**
 * A range is a match for a day when the two overlap; before uses where the range ends and after where it starts, and
 * "on or before" and "on or after" keep the day itself.
 */
const datePredicates: PageFilterPredicates = {
  [PAGE_FILTER_OPERATOR.IS]: compareDate(PAGE_FILTER_OPERATOR.IS),
  [PAGE_FILTER_OPERATOR.IS_BEFORE]: compareDate(PAGE_FILTER_OPERATOR.IS_BEFORE),
  [PAGE_FILTER_OPERATOR.IS_AFTER]: compareDate(PAGE_FILTER_OPERATOR.IS_AFTER),
  [PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE]: compareDate(PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE),
  [PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER]: compareDate(PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER),
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
    PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE,
    PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER,
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

const NEGATIVE_OPERATORS: readonly PageFilterOperator[] = [
  PAGE_FILTER_OPERATOR.IS_NOT,
  PAGE_FILTER_OPERATOR.NOT_CONTAINS,
  PAGE_FILTER_OPERATOR.IS_NOT_IN_GROUP,
];

/**
 * Whether a row with nothing in the property satisfies a condition on it. Such a row is not there to be compared, so a
 * condition that asks for a value ("is", "contains", "before") does not match it and one that asks for its absence
 * ("is not", "does not contain") does. A checkbox never touched reads as unchecked.
 */
export const matchesMissingPageValue = (
  logicalType: PagePropertyLogicalType,
  operator: PageFilterOperator,
  argument: PagePropertyValue,
): boolean => {
  if (NEGATIVE_OPERATORS.includes(operator)) return true;
  return (
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN && operator === PAGE_FILTER_OPERATOR.IS && argument === false
  );
};

const matchesCondition = (
  condition: PageFilterCondition,
  propertyValues: PagePropertyValues,
  properties: readonly PageViewProperty[],
  context: PageFilterContext,
): boolean => {
  const property = properties.find((candidate) => candidate.key === condition.propertyKey);
  if (property === undefined) return true;
  const value = readPagePropertyValue(propertyValues, condition.propertyKey);
  const emptinessResult = matchesEmptinessOperator(condition.operator, isPagePropertyValueEmpty(property.type, value));
  if (emptinessResult !== null) return emptinessResult;
  if (condition.value === null) return true;
  const logicalType = getPagePropertyLogicalType(property.type);
  const predicate = PREDICATES_BY_LOGICAL_TYPE[logicalType][condition.operator];
  if (predicate === undefined) return true;
  if (value === undefined) return matchesMissingPageValue(logicalType, condition.operator, condition.value);
  return predicate(value, condition.value, property, context);
};

/**
 * Whether a row passes the filter. A marker such as "me" or "this week" is not understood here: resolve the filter for
 * the viewer first (`resolvePageFilter`).
 */
export const matchesPageFilter = (
  filter: PageFilter,
  propertyValues: PagePropertyValues,
  properties: readonly PageViewProperty[],
  context: PageFilterContext = UTC_FILTER_CONTEXT,
): boolean => {
  if (filter.kind === 'CONDITION') return matchesCondition(filter, propertyValues, properties, context);
  if (filter.conditions.length === 0) return true;
  return filter.operator === PAGE_FILTER_GROUP_OPERATOR.AND
    ? filter.conditions.every((condition) => matchesPageFilter(condition, propertyValues, properties, context))
    : filter.conditions.some((condition) => matchesPageFilter(condition, propertyValues, properties, context));
};
