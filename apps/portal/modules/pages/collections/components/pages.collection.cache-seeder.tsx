'use client';

import { usePagesViewCaching } from '../hooks/use.pages.view-caching';
import type { PagesViewCachingInput } from '../types/pages.view-cache.types';

/** Draws nothing: it keeps what the server drew of the view in the cache of the browser. */
export const PagesCollectionCacheSeeder = (input: PagesViewCachingInput) => {
  usePagesViewCaching(input);
  return null;
};
