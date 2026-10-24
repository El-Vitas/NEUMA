'use client';

import { useEffect, useState } from 'react';
import { env } from '@/config/env.config';
import { openBrowserBlockLiveSocket } from '../../block-sync/lib/block-sync.socket.lib';
import { requestBlockLiveToken } from '../../block-sync/lib/block-sync.token.lib';
import { PAGE_TREE_RELOAD_DEBOUNCE_MS } from '../constants/pages.tree.constants';
import { createPageTreeLiveSession } from '../lib/pages.tree.live.lib';
import type { PageTreeStore } from '../types/pages.tree.types';

/**
 * Follows the page tree of these spaces on the live channel. Changes that arrive together are read once, and the
 * parents named that are not open cost nothing.
 */
export const usePagesTreeLive = (
  store: PageTreeStore,
  spaceIds: readonly string[],
  renderedWatermarks: Readonly<Record<string, string>>,
): void => {
  const spaceKey = spaceIds.join('|');
  // The render the first subscription must catch up with is the one that mounted this; later renders are newer.
  const [watermarks] = useState(renderedWatermarks);

  useEffect(() => {
    const spaces = spaceKey === '' ? [] : spaceKey.split('|');
    if (spaces.length === 0) return;
    const pendingParents = new Map<string, Set<string | null>>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = (): void => {
      timer = null;
      for (const [spaceId, parentIds] of pendingParents) void store.reloadParents(spaceId, [...parentIds]);
      pendingParents.clear();
    };
    const schedule = (): void => {
      timer ??= setTimeout(flush, PAGE_TREE_RELOAD_DEBOUNCE_MS);
    };

    const session = createPageTreeLiveSession({
      handlers: {
        onChanged: (spaceId, parentIds) => {
          const wanted = pendingParents.get(spaceId) ?? new Set<string | null>();
          for (const parentId of parentIds) wanted.add(parentId);
          pendingParents.set(spaceId, wanted);
          schedule();
        },
        onReconnected: () => {
          for (const spaceId of spaces) void store.reloadSpace(spaceId);
        },
        onResync: (spaceId) => {
          void store.reloadSpace(spaceId);
        },
      },
      openSocket: openBrowserBlockLiveSocket,
      requestToken: requestBlockLiveToken,
      spaceIds: spaces,
      url: env.NEXT_PUBLIC_LIVE_WS_URL,
      watermarks,
    });
    return () => {
      session.destroy();
      if (timer !== null) clearTimeout(timer);
    };
  }, [spaceKey, store, watermarks]);
};
