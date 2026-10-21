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
 * Follows the collections a rollup reads. Whatever changes in them makes the page draw again, because the values it
 * shows were computed from the rows that changed; the views never place those rows, they are not theirs.
 */
export const usePagesComputedSources = (collectionIds: readonly string[]): void => {
  const notices = useContext(PAGE_COLLECTION_NOTICES_CONTEXT);
  const followed = collectionIds.join(',');

  useEffect(() => {
    const sessions = followed
      .split(',')
      .filter((collectionId) => collectionId !== '')
      .map((collectionId) =>
        createBlockLiveSession({
          collectionId,
          handlers: {
            onConnected: () => undefined,
            onDisconnected: () => undefined,
            onPresence: () => undefined,
            onResync: () => undefined,
            onRevoked: () => undefined,
            onStatusChange: () => undefined,
            onVersions: () => undefined,
          },
          onCollectionMessage: (message) => {
            if (message.type === 'collection-changes') notices.requestRefresh('computed-source');
          },
          openSocket: openBrowserBlockLiveSocket,
          pageId: collectionId,
          requestToken: requestLiveToken,
          url: env.NEXT_PUBLIC_LIVE_WS_URL,
        }),
      );
    return () => {
      for (const session of sessions) session.destroy();
    };
  }, [followed, notices]);
};
