import { createContext } from 'react';
import type { PagesCollectionCacheSession } from '../types/pages.view-cache.types';

/** The cache of this person in this browser, once it is open; null before that, and for a page nobody signed in to. */
export const PAGE_COLLECTION_CACHE_CONTEXT = createContext<null | PagesCollectionCacheSession>(null);
