'use client';

import { useEffect } from 'react';
import { env } from '@/config/env.config';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { createBlockLiveSession } from '../../block-sync/lib/block-sync.session.lib';
import { openBrowserBlockLiveSocket } from '../../block-sync/lib/block-sync.socket.lib';
import { getBlockLiveToken } from '../../block-sync/server/actions/block-sync.actions';
import { PAGE_COLLECTION_LIVE_COALESCE_MS } from '../constants/pages.collection-live.constants';
import { createCollectionRefreshCoalescer } from '../lib/pages.collection-live.lib';
import { refreshPageCollectionAction } from '../server/actions/pages.collections.actions';

const requestLiveToken = async (): Promise<string | null> => {
  const result = await callAction(() => getBlockLiveToken({}));
  return isActionSuccess<{ readonly token: string }>(result) ? result.data.token : null;
};

/**
 * Follows a collection on the live channel: when someone else changes a row, a view or the schema, the view is drawn
 * again. A burst of notices is one refresh, and a reconnection refreshes once because notices in between are lost.
 */
export const usePagesCollectionLive = (collectionId: string, spaceId: string): void => {
  useEffect(() => {
    const coalescer = createCollectionRefreshCoalescer(async () => {
      await callAction(() => refreshPageCollectionAction({ spaceId }));
    }, PAGE_COLLECTION_LIVE_COALESCE_MS);
    let hasConnected = false;
    const session = createBlockLiveSession({
      collectionId,
      handlers: {
        onConnected: () => {
          if (hasConnected) coalescer.request();
          hasConnected = true;
        },
        onDisconnected: () => undefined,
        onPresence: () => undefined,
        onResync: () => undefined,
        onRevoked: () => coalescer.request(),
        onStatusChange: () => undefined,
        onVersions: () => undefined,
      },
      onCollectionMessage: () => coalescer.request(),
      openSocket: openBrowserBlockLiveSocket,
      pageId: collectionId,
      requestToken: requestLiveToken,
      url: env.NEXT_PUBLIC_LIVE_WS_URL,
    });
    return () => {
      coalescer.cancel();
      session.destroy();
    };
  }, [collectionId, spaceId]);
};
