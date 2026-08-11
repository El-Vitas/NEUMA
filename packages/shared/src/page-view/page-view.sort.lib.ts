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
import type { PageSort, PageViewProperty } from './page-view.types.js';
import { PAGE_SORT_DIRECTION } from './page-view.types.js';

type PageValueComparator = (left: PagePropertyValue, right: PagePropertyValue) => number;

const toText = (value: PagePropertyValue): string => (Array.isArray(value) ? value.join(', ') : String(value));

const compareAsText: PageValueComparator = (left, right) => toText(left).localeCompare(toText(right));

const compareAsNumber: PageValueComparator = (left, right) =>
  typeof left === 'number' && typeof right === 'number' ? left - right : 0;

const compareAsBoolean: PageValueComparator = (left, right) => Number(left === true) - Number(right === true);

const compareAsDate: PageValueComparator = (left, right) => {
  const leftTime = Date.parse(toText(left));
  const rightTime = Date.parse(toText(right));
  return Number.isNaN(leftTime) || Number.isNaN(rightTime) ? 0 : leftTime - rightTime;
};

const COMPARATORS_BY_LOGICAL_TYPE: Readonly<Record<PagePropertyLogicalType, PageValueComparator>> = {
  [PAGE_PROPERTY_LOGICAL_TYPE.TEXT]: compareAsText,
  [PAGE_PROPERTY_LOGICAL_TYPE.NUMBER]: compareAsNumber,
  [PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN]: compareAsBoolean,
  [PAGE_PROPERTY_LOGICAL_TYPE.DATE]: compareAsDate,
  [PAGE_PROPERTY_LOGICAL_TYPE.TAG]: compareAsText,
  [PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG]: compareAsText,
};

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
  const comparison = COMPARATORS_BY_LOGICAL_TYPE[getPagePropertyLogicalType(property.type)](leftValue, rightValue);
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
