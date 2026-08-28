import { PAGE_COLLECTION_VIEW_SEARCH_PARAM } from '../constants/pages.collections.constants';
import type { PageSchemaView } from '../types/pages.schema.types';

/**
 * Which view of a collection is open.
 *
 * The address decides, and when it names nothing or names a view that no longer
 * exists, the collection opens on the one it calls its own. Landing on the
 * default beats landing on an empty screen for an address somebody kept from
 * before the view was deleted.
 */
export const resolveActiveCollectionView = (
  views: readonly PageSchemaView[],
  requestedName: null | string,
): PageSchemaView | null => {
  const requested = views.find((view) => view.name === requestedName);
  if (requested !== undefined) return requested;
  return views.find((view) => view.isDefault) ?? views[0] ?? null;
};

/** A relative address for one view, which a server-rendered tab can point at without knowing where it stands. */
export const buildCollectionViewHref = (viewName: string): string =>
  `?${new URLSearchParams({ [PAGE_COLLECTION_VIEW_SEARCH_PARAM]: viewName }).toString()}`;
