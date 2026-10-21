import type { PageFilter } from '@neuma/shared';
import { isValidPageDateValue, PAGE_QUERY_LIMITS, pageFilterSchema, readPageCalendarMonth } from '@neuma/shared';
import type { RouteSearchParamValue } from '@/shared/types/route-search-params.types';
import {
  PAGE_COLLECTION_DAY_SEARCH_PARAM,
  PAGE_COLLECTION_MONTH_SEARCH_PARAM,
  PAGE_COLLECTION_QUICK_FILTER_MAXIMUM_LENGTH,
  PAGE_COLLECTION_QUICK_FILTER_SEARCH_PARAM,
  PAGE_COLLECTION_ROW_SEARCH_PARAM,
  PAGE_COLLECTION_VIEW_SEARCH_PARAM,
} from '../constants/pages.collections.constants';
import type { CollectionHrefOptions } from '../types/pages.collections.types';
import type { PageSchemaView } from '../types/pages.schema.types';

/** Falls back to the default view when the URL names a view that was deleted, rather than an empty screen. */
export const resolveActiveCollectionView = (
  views: readonly PageSchemaView[],
  requestedName: null | string,
): PageSchemaView | null => {
  const requested = views.find((view) => view.name === requestedName);
  if (requested !== undefined) return requested;
  return views.find((view) => view.isDefault) ?? views[0] ?? null;
};

/** Relative, so a server-rendered tab can link to it without knowing the current path. */
export const buildCollectionViewHref = (viewName: string, options: CollectionHrefOptions = {}): string => {
  const words = (options.search ?? '').trim();
  const parameters = new URLSearchParams({ [PAGE_COLLECTION_VIEW_SEARCH_PARAM]: viewName });
  if (words !== '') parameters.set(PAGE_COLLECTION_ROW_SEARCH_PARAM, words);
  if (options.quickFilter !== undefined && options.quickFilter !== null) {
    parameters.set(PAGE_COLLECTION_QUICK_FILTER_SEARCH_PARAM, JSON.stringify(options.quickFilter));
  }
  if (options.month !== undefined) parameters.set(PAGE_COLLECTION_MONTH_SEARCH_PARAM, options.month);
  if (options.day !== undefined) parameters.set(PAGE_COLLECTION_DAY_SEARCH_PARAM, options.day);
  return `?${parameters.toString()}`;
};

/** Something that is not a real day is read as nothing, so a mistyped address opens the view around today. */
export const readCollectionDay = (raw: RouteSearchParamValue): null | string => {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return candidate !== undefined &&
    isValidPageDateValue({ start: candidate }) &&
    candidate.length === 'YYYY-MM-DD'.length
    ? candidate
    : null;
};

/** Something that is not a month is read as nothing, so a mistyped address opens the calendar on its default month. */
export const readCollectionMonth = (raw: RouteSearchParamValue): null | string => {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return candidate === undefined ? null : readPageCalendarMonth(candidate);
};

/** What is not a filter the server would accept is read as no filter, so a mistyped address still opens the view. */
export const readCollectionQuickFilter = (raw: RouteSearchParamValue): null | PageFilter => {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (candidate === undefined || candidate.length > PAGE_COLLECTION_QUICK_FILTER_MAXIMUM_LENGTH) return null;
  try {
    const parsed = pageFilterSchema.safeParse(JSON.parse(candidate));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** A repeated parameter keeps only the first value; words longer than the server accepts are cut. */
export const readCollectionSearch = (raw: RouteSearchParamValue): string => {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return (candidate ?? '').trim().slice(0, PAGE_QUERY_LIMITS.maximumSearchLength);
};
