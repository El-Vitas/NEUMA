import { PAGE_QUERY_LIMITS, readPageCalendarMonth } from '@neuma/shared';
import type { RouteSearchParamValue } from '@/shared/types/route-search-params.types';
import {
  PAGE_COLLECTION_MONTH_SEARCH_PARAM,
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
  if (options.month !== undefined) parameters.set(PAGE_COLLECTION_MONTH_SEARCH_PARAM, options.month);
  return `?${parameters.toString()}`;
};

/** Something that is not a month is read as nothing, so a mistyped address opens the calendar on its default month. */
export const readCollectionMonth = (raw: RouteSearchParamValue): null | string => {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return candidate === undefined ? null : readPageCalendarMonth(candidate);
};

/** A repeated parameter keeps only the first value; words longer than the server accepts are cut. */
export const readCollectionSearch = (raw: RouteSearchParamValue): string => {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return (candidate ?? '').trim().slice(0, PAGE_QUERY_LIMITS.maximumSearchLength);
};
