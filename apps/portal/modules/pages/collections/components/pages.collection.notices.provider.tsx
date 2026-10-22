'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { callAction } from '@/shared/lib/action-result';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { PAGE_COLLECTION_LIVE_COALESCE_MS, STALE_REFRESH_REASONS } from '../constants/pages.collection-live.constants';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';
import {
  createCollectionRefreshCoalescer,
  readStaleRowsCause,
  routeCollectionMessage,
} from '../lib/pages.collection-live.lib';
import { refreshPageCollectionAction } from '../server/actions/pages.collections.actions';
import type { CollectionChangesMessage, PagesCollectionNotices } from '../types/pages.collection-live.types';

interface IProps {
  readonly children: ReactNode;
  readonly spaceId: string;
}

/**
 * The meeting point of the live channel and the views of one collection. The views that place changes by themselves
 * subscribe; everything else draws the page again from the server, in one refresh per burst.
 */
export const PagesCollectionNoticesProvider = ({ children, spaceId }: IProps) => {
  const followers = useRef(new Set<(message: CollectionChangesMessage) => void>());
  const staleReaders = useRef(new Set<(cause: string) => void>());
  const coalescer = useMemo(
    () =>
      createCollectionRefreshCoalescer(async () => {
        await callAction(() => refreshPageCollectionAction({ spaceId }));
      }, PAGE_COLLECTION_LIVE_COALESCE_MS),
    [spaceId],
  );
  useEffect(() => () => coalescer.cancel(), [coalescer]);

  const notices = useMemo<PagesCollectionNotices>(() => {
    const tellStale = (cause: string): void => {
      for (const reader of staleReaders.current) reader(cause);
    };
    return {
      dispatch: (message) => {
        const staleCause = readStaleRowsCause(message);
        if (staleCause !== null) tellStale(staleCause);
        if (routeCollectionMessage(message, followers.current.size > 0) === 'refresh') {
          coalescer.request();
          return;
        }
        if (message.type !== 'collection-changes') return;
        for (const follower of followers.current) follower(message);
      },
      requestRefresh: (reason) => {
        browserLogger.warn({ reason }, 'A view went to the server for what it could not place');
        if (STALE_REFRESH_REASONS.includes(reason)) tellStale(reason);
        coalescer.request();
      },
      subscribe: (listener) => {
        followers.current.add(listener);
        return () => {
          followers.current.delete(listener);
        };
      },
      subscribeStale: (listener) => {
        staleReaders.current.add(listener);
        return () => {
          staleReaders.current.delete(listener);
        };
      },
    };
  }, [coalescer]);

  return <PAGE_COLLECTION_NOTICES_CONTEXT value={notices}>{children}</PAGE_COLLECTION_NOTICES_CONTEXT>;
};
