import type { PagePropertyValue } from '../page-property/page-property.types.js';
import { isStringList, toValueList } from '../page-property/page-property.value.lib.js';
import {
  PAGE_FILTER_MARKER_PREFIX,
  PAGE_FILTER_ME,
  PAGE_FILTER_ME_PROPERTY_TYPES,
  PAGE_RELATIVE_DATE,
  PAGE_RELATIVE_DATE_PROPERTY_TYPES,
  PAGE_RELATIVE_MAXIMUM_DAYS,
  PAGE_RELATIVE_NEXT_DAYS_PREFIX,
  PAGE_RELATIVE_PAST_DAYS_PREFIX,
} from './page-view.relative.constants.js';
import type { PageDayRange, PageFilterViewer, PageRelativeDate } from './page-view.relative.types.js';
import type { PageFilter, PageFilterCondition, PageViewProperty } from './page-view.types.js';
import { addPageDays, readPageLocalDay, readPageWeekday } from './page-view.zone.lib.js';

const DAYS_IN_A_WEEK = 7;

const FIXED_RELATIVE_DATES: Readonly<Partial<Record<string, PageRelativeDate>>> = {
  [PAGE_RELATIVE_DATE.LAST_MONTH]: { kind: 'MONTH', offset: -1 },
  [PAGE_RELATIVE_DATE.LAST_WEEK]: { kind: 'WEEK', offset: -1 },
  [PAGE_RELATIVE_DATE.NEXT_MONTH]: { kind: 'MONTH', offset: 1 },
  [PAGE_RELATIVE_DATE.NEXT_WEEK]: { kind: 'WEEK', offset: 1 },
  [PAGE_RELATIVE_DATE.THIS_MONTH]: { kind: 'MONTH', offset: 0 },
  [PAGE_RELATIVE_DATE.THIS_WEEK]: { kind: 'WEEK', offset: 0 },
  [PAGE_RELATIVE_DATE.TODAY]: { kind: 'DAY', offset: 0 },
  [PAGE_RELATIVE_DATE.TOMORROW]: { kind: 'DAY', offset: 1 },
  [PAGE_RELATIVE_DATE.YESTERDAY]: { kind: 'DAY', offset: -1 },
};

const readDayCount = (text: string): number | null => {
  if (!/^\d{1,3}$/.test(text)) return null;
  const count = Number(text);
  return count >= 1 && count <= PAGE_RELATIVE_MAXIMUM_DAYS ? count : null;
};

/** Reads a marker such as `@this_week` or `@past_days:7`; null for anything else. */
export const readPageRelativeDate = (text: string): PageRelativeDate | null => {
  const fixed = FIXED_RELATIVE_DATES[text];
  if (fixed !== undefined) return fixed;
  if (text.startsWith(PAGE_RELATIVE_PAST_DAYS_PREFIX)) {
    const count = readDayCount(text.slice(PAGE_RELATIVE_PAST_DAYS_PREFIX.length));
    return count === null ? null : { count, kind: 'PAST_DAYS' };
  }
  if (text.startsWith(PAGE_RELATIVE_NEXT_DAYS_PREFIX)) {
    const count = readDayCount(text.slice(PAGE_RELATIVE_NEXT_DAYS_PREFIX.length));
    return count === null ? null : { count, kind: 'NEXT_DAYS' };
  }
  return null;
};

const readWeekRange = (today: string, offset: number): PageDayRange => {
  const sinceMonday = (readPageWeekday(today) + DAYS_IN_A_WEEK - 1) % DAYS_IN_A_WEEK;
  const start = addPageDays(today, -sinceMonday + offset * DAYS_IN_A_WEEK);
  return { end: addPageDays(start, DAYS_IN_A_WEEK - 1), start };
};

const readMonthRange = (today: string, offset: number): PageDayRange => {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const last = new Date(Date.UTC(year, month + offset, 0));
  return { end: last.toISOString().slice(0, 10), start: first.toISOString().slice(0, 10) };
};

/**
 * The days a relative date covers when today is `today`. Weeks run from Monday to Sunday. "Past N days" are the N days
 * that end today and "next N days" the N that start today, so today belongs to both.
 */
export const resolvePageRelativeRange = (relative: PageRelativeDate, today: string): PageDayRange => {
  switch (relative.kind) {
    case 'DAY': {
      const day = addPageDays(today, relative.offset);
      return { end: day, start: day };
    }
    case 'WEEK':
      return readWeekRange(today, relative.offset);
    case 'MONTH':
      return readMonthRange(today, relative.offset);
    case 'PAST_DAYS':
      return { end: today, start: addPageDays(today, 1 - relative.count) };
    case 'NEXT_DAYS':
      return { end: addPageDays(today, relative.count - 1), start: today };
  }
};

const isOfTypes = (property: PageViewProperty, types: readonly string[]): boolean => types.includes(property.type);

const resolveDate = (value: PagePropertyValue, viewer: PageFilterViewer): PagePropertyValue => {
  if (typeof value !== 'string') return value;
  const relative = readPageRelativeDate(value);
  if (relative === null) return value;
  return resolvePageRelativeRange(relative, readPageLocalDay(viewer.now, viewer.timeZone));
};

const resolveViewer = (value: PagePropertyValue, viewer: PageFilterViewer): PagePropertyValue => {
  if (typeof value === 'string') return value === PAGE_FILTER_ME ? viewer.viewerId : value;
  if (!isStringList(value)) return value;
  return value.map((entry) => (entry === PAGE_FILTER_ME ? viewer.viewerId : entry));
};

const resolveCondition = (
  condition: PageFilterCondition,
  properties: readonly PageViewProperty[],
  viewer: PageFilterViewer,
): PageFilterCondition => {
  const property = properties.find((candidate) => candidate.key === condition.propertyKey);
  if (property === undefined || condition.value === null) return condition;
  if (isOfTypes(property, PAGE_RELATIVE_DATE_PROPERTY_TYPES)) {
    return { ...condition, value: resolveDate(condition.value, viewer) };
  }
  if (isOfTypes(property, PAGE_FILTER_ME_PROPERTY_TYPES)) {
    return { ...condition, value: resolveViewer(condition.value, viewer) };
  }
  return condition;
};

/**
 * The filter with its markers replaced for whoever looks: a relative date becomes the days it covers in their zone
 * today, and "me" becomes their id. Nothing that is stored changes, so two viewers of one view get two answers.
 */
export const resolvePageFilter = (
  filter: PageFilter,
  properties: readonly PageViewProperty[],
  viewer: PageFilterViewer,
): PageFilter => {
  if (filter.kind === 'CONDITION') return resolveCondition(filter, properties, viewer);
  return {
    ...filter,
    conditions: filter.conditions.map((child) => resolvePageFilter(child, properties, viewer)),
  };
};

const isMarker = (entry: string): boolean => entry.startsWith(PAGE_FILTER_MARKER_PREFIX);

const findInvalidDateMarker = (value: PagePropertyValue): string | null => {
  if (typeof value !== 'string' || !isMarker(value) || readPageRelativeDate(value) !== null) return null;
  return `"${value}" is not a relative date`;
};

const findInvalidViewerMarker = (value: PagePropertyValue): string | null => {
  const entries = typeof value === 'string' ? [value] : toValueList(value);
  const invalid = entries.find((entry) => isMarker(entry) && entry !== PAGE_FILTER_ME);
  return invalid === undefined ? null : `"${invalid}" is not a person marker; use "${PAGE_FILTER_ME}"`;
};

const findInvalidTokenInCondition = (
  condition: PageFilterCondition,
  properties: readonly PageViewProperty[],
): string | null => {
  const property = properties.find((candidate) => candidate.key === condition.propertyKey);
  if (property === undefined || condition.value === null) return null;
  if (isOfTypes(property, PAGE_RELATIVE_DATE_PROPERTY_TYPES)) return findInvalidDateMarker(condition.value);
  if (isOfTypes(property, PAGE_FILTER_ME_PROPERTY_TYPES)) return findInvalidViewerMarker(condition.value);
  return null;
};

/** A message naming the first marker that is not one, or null when every marker means something. */
export const findInvalidPageFilterToken = (
  filter: PageFilter,
  properties: readonly PageViewProperty[],
): string | null => {
  if (filter.kind === 'CONDITION') return findInvalidTokenInCondition(filter, properties);
  for (const child of filter.conditions) {
    const invalid = findInvalidPageFilterToken(child, properties);
    if (invalid !== null) return invalid;
  }
  return null;
};
