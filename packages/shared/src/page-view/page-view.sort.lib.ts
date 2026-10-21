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
import type {
  PagePropertyLogicalType,
  PagePropertyOption,
  PagePropertyValue,
  PagePropertyValues,
} from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_LOGICAL_TYPE, PAGE_STATUS_GROUP_VALUES } from '../page-property/page-property.types.js';
import { isStringList, toValueList, toValueText } from '../page-property/page-property.value.lib.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import type { PageSort, PageViewProperty } from './page-view.types.js';
import { PAGE_SORT_DIRECTION } from './page-view.types.js';

type PageValueComparator = (left: PagePropertyValue, right: PagePropertyValue, property: PageViewProperty) => number;

/** Far above any real list of options, so the group always decides before the position does. */
const GROUP_RANK_WEIGHT = 1_000_000;

/** An id the property no longer has goes after every option that exists. */
const UNKNOWN_OPTION_RANK = Number.MAX_SAFE_INTEGER;

const toText = (value: PagePropertyValue): string => (isStringList(value) ? value.join(', ') : toValueText(value));

const compareAsText: PageValueComparator = (left, right) => toText(left).localeCompare(toText(right));

const compareAsNumber: PageValueComparator = (left, right) =>
  typeof left === 'number' && typeof right === 'number' ? left - right : 0;

const compareAsBoolean: PageValueComparator = (left, right) => Number(left === true) - Number(right === true);

const compareAsDate: PageValueComparator = (left, right) => {
  const leftDate = readPageDateValue(left);
  const rightDate = readPageDateValue(right);
  if (leftDate === null || rightDate === null) return 0;
  const byStart = getPageDateStartTime(leftDate) - getPageDateStartTime(rightDate);
  return byStart === 0 ? getPageDateEndTime(leftDate) - getPageDateEndTime(rightDate) : byStart;
};

const rankOption = (optionId: string, options: readonly PagePropertyOption[]): number => {
  const position = options.findIndex((option) => option.id === optionId);
  return position === -1 ? UNKNOWN_OPTION_RANK : position;
};

const rankStatusOption = (optionId: string, options: readonly PagePropertyOption[]): number => {
  const option = options.find((candidate) => candidate.id === optionId);
  if (option === undefined) return UNKNOWN_OPTION_RANK;
  const groupRank = PAGE_STATUS_GROUP_VALUES.findIndex((group) => group === option.group);
  const position = options.filter((candidate) => candidate.group === option.group).indexOf(option);
  return groupRank * GROUP_RANK_WEIGHT + position;
};

/** The order of the options is the order the person chose, and it can be written in SQL without joining names. */
const compareByOptionPosition: PageValueComparator = (left, right, property) => {
  const options = property.options ?? [];
  const rankOf = (value: PagePropertyValue): number =>
    isStringList(value)
      ? Math.min(UNKNOWN_OPTION_RANK, ...value.map((entry) => rankOption(entry, options)))
      : rankOption(toText(value), options);
  return rankOf(left) - rankOf(right);
};

const compareStatus: PageValueComparator = (left, right, property) => {
  const options = property.options ?? [];
  return rankStatusOption(toText(left), options) - rankStatusOption(toText(right), options);
};

const compareByCount: PageValueComparator = (left, right) => toValueList(left).length - toValueList(right).length;

const compareNothing: PageValueComparator = () => 0;

const COMPARATORS_BY_LOGICAL_TYPE: Readonly<Record<PagePropertyLogicalType, PageValueComparator>> = {
  [PAGE_PROPERTY_LOGICAL_TYPE.TEXT]: compareAsText,
  [PAGE_PROPERTY_LOGICAL_TYPE.NUMBER]: compareAsNumber,
  [PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN]: compareAsBoolean,
  [PAGE_PROPERTY_LOGICAL_TYPE.DATE]: compareAsDate,
  [PAGE_PROPERTY_LOGICAL_TYPE.TAG]: compareAsText,
  [PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG]: compareAsText,
  [PAGE_PROPERTY_LOGICAL_TYPE.STATUS]: compareStatus,
  [PAGE_PROPERTY_LOGICAL_TYPE.RELATION]: compareByCount,
  [PAGE_PROPERTY_LOGICAL_TYPE.FILES]: compareNothing,
};

const hasOrderedOptions = (property: PageViewProperty): boolean =>
  (property.options ?? []).length > 0 &&
  (property.type === PAGE_PROPERTY_TYPE.SELECT || property.type === PAGE_PROPERTY_TYPE.MULTI_SELECT);

const pickComparator = (property: PageViewProperty): PageValueComparator =>
  hasOrderedOptions(property)
    ? compareByOptionPosition
    : COMPARATORS_BY_LOGICAL_TYPE[getPagePropertyLogicalType(property.type)];

const compareEmptiness = (isLeftEmpty: boolean, isRightEmpty: boolean): number =>
  Number(isLeftEmpty) - Number(isRightEmpty);

const compareBySort = (
  sort: PageSort,
  leftValues: PagePropertyValues,
  rightValues: PagePropertyValues,
  properties: readonly PageViewProperty[],
): number => {
  const property = properties.find((candidate) => candidate.key === sort.propertyKey);
  if (property === undefined) return 0;
  const leftValue = readPagePropertyValue(leftValues, sort.propertyKey);
  const rightValue = readPagePropertyValue(rightValues, sort.propertyKey);
  const isLeftEmpty = isPagePropertyValueEmpty(property.type, leftValue);
  const isRightEmpty = isPagePropertyValueEmpty(property.type, rightValue);
  if (isLeftEmpty || isRightEmpty) return compareEmptiness(isLeftEmpty, isRightEmpty);
  if (leftValue === undefined || rightValue === undefined) return 0;
  const comparison = pickComparator(property)(leftValue, rightValue, property);
  return sort.direction === PAGE_SORT_DIRECTION.DESCENDING ? -comparison : comparison;
};

export const comparePageRowsBySorts = (
  sorts: readonly PageSort[],
  leftValues: PagePropertyValues,
  rightValues: PagePropertyValues,
  properties: readonly PageViewProperty[],
): number => {
  for (const sort of sorts) {
    const comparison = compareBySort(sort, leftValues, rightValues, properties);
    if (comparison !== 0) return comparison;
  }
  return 0;
};
