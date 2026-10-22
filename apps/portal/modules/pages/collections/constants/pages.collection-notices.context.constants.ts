import { createContext } from 'react';
import type { PagesCollectionNotices } from '../types/pages.collection-live.types';

/** Without a provider nothing follows the changes by itself and no notice is lost: there is nothing to tell. */
export const PAGE_COLLECTION_NOTICES_CONTEXT = createContext<PagesCollectionNotices>({
  dispatch: () => undefined,
  requestRefresh: () => undefined,
  subscribe: () => () => undefined,
  subscribeStale: () => () => undefined,
});
