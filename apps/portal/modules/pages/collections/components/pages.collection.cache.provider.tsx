'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { openBrowserLocalCache } from '../../local-cache/lib/local-cache.browser.lib';
import { PAGE_COLLECTION_CACHE_CONTEXT } from '../constants/pages.view-cache.context.constants';
import type { CachedRowBody, PagesCollectionCacheSession } from '../types/pages.view-cache.types';

interface IProps {
  readonly children: ReactNode;
  readonly userId: string;
}

/**
 * Opens the cache of the person once, as soon as the portal is on screen, and shares it with every view. Opening it as
 * another person empties what the last one left (ADR 029), so it opens before any view reads from it.
 */
export const PagesCollectionCacheProvider = ({ children, userId }: IProps) => {
  const [session, setSession] = useState<null | PagesCollectionCacheSession>(null);

  useEffect(() => {
    let isCurrent = true;
    openBrowserLocalCache<CachedRowBody>(userId)
      .then((opened) => {
        if (isCurrent) setSession({ ...opened, userId });
      })
      .catch((error: unknown) => {
        browserLogger.error({ err: error }, 'The local cache could not be opened');
      });
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  return <PAGE_COLLECTION_CACHE_CONTEXT value={session}>{children}</PAGE_COLLECTION_CACHE_CONTEXT>;
};
