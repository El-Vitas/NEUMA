'use client';

import { useContext, useEffect } from 'react';
import { env } from '@/config/env.config';
import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import { createBlockLiveSession } from '../../block-sync/lib/block-sync.session.lib';
import { openBrowserBlockLiveSocket } from '../../block-sync/lib/block-sync.socket.lib';
import { getBlockLiveToken } from '../../block-sync/server/actions/block-sync.actions';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '../constants/pages.collection-notices.context.constants';

const requestLiveToken = async (): Promise<string | null> => {
  const result = await callAction(() => getBlockLiveToken({}));
  return isActionSuccess<{ readonly token: string }>(result) ? result.data.token : null;
};

/**
 * Follows a collection on the live channel and hands what arrives to the views through the notices of the page. A
 * reconnection draws the page again, because the notices in between were lost.
 */
export const usePagesCollectionLive = (collectionId: string): void => {
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);

  useEffect(() => {
    let hasConnected = false;
    const session = createBlockLiveSession({
      collectionId,
      handlers: {
        onConnected: () => {
          if (hasConnected) notices.requestRefresh('reconnected');
          hasConnected = true;
        },
        onDisconnected: () => undefined,
        onPresence: () => undefined,
        onResync: () => undefined,
        onRevoked: () => notices.requestRefresh('revoked'),
        onStatusChange: () => undefined,
        onVersions: () => undefined,
      },
      onCollectionMessage: notices.dispatch,
      openSocket: openBrowserBlockLiveSocket,
      pageId: collectionId,
      requestToken: requestLiveToken,
      url: env.NEXT_PUBLIC_LIVE_WS_URL,
    });
    return () => session.destroy();
  }, [collectionId, notices]);
};
