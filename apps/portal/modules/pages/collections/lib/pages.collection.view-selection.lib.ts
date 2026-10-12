import { PAGE_COLLECTION_VIEW_SEARCH_PARAM } from '../constants/pages.collections.constants';
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
export const buildCollectionViewHref = (viewName: string): string =>
  `?${new URLSearchParams({ [PAGE_COLLECTION_VIEW_SEARCH_PARAM]: viewName }).toString()}`;
