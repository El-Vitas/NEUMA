'use client';

import { useCallback, useEffect, useState } from 'react';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { LOCAL_CACHE_OUTBOX_CHANGED_EVENT, LOCAL_CACHE_OUTBOX_RETRY_EVENT } from '../constants/local-cache.constants';
import { openBrowserLocalCache } from '../lib/local-cache.browser.lib';
import { filterRejectedOfPage } from '../lib/local-cache.rejected.lib';
import type { CacheableBody, Outbox, RejectedChanges } from '../types/local-cache.types';

/** The changes of a page that the server refused and the person has not decided on yet. */
export const useRejectedChanges = (userId: null | string, pageId: string): RejectedChanges => {
  const [outbox, setOutbox] = useState<null | Outbox>(null);
  const [items, setItems] = useState<RejectedChanges['items']>([]);

  const read = useCallback(
    async (opened: Outbox): Promise<void> => {
      try {
        setItems(filterRejectedOfPage(await opened.listRejected(), pageId));
      } catch (error) {
        browserLogger.error({ err: error }, 'The changes that were not applied could not be read');
      }
    },
    [pageId],
  );

  useEffect(() => {
    if (userId === null) return;
    let isCurrent = true;
    void openBrowserLocalCache<CacheableBody>(userId)
      .then((opened) => {
        if (!isCurrent) return;
        setOutbox(opened.outbox);
        return read(opened.outbox);
      })
      .catch((error: unknown) => {
        browserLogger.error({ err: error }, 'The changes that were not applied could not be opened');
      });
    return () => {
      isCurrent = false;
    };
  }, [read, userId]);

  useEffect(() => {
    if (outbox === null) return;
    const reread = (): void => {
      void read(outbox);
    };
    window.addEventListener(LOCAL_CACHE_OUTBOX_CHANGED_EVENT, reread);
    return () => window.removeEventListener(LOCAL_CACHE_OUTBOX_CHANGED_EVENT, reread);
  }, [outbox, read]);

  const discard = async (id: string): Promise<void> => {
    if (outbox === null) return;
    try {
      await outbox.discardRejected(id);
    } catch (error) {
      browserLogger.error({ err: error }, 'A change that was not applied could not be discarded');
    }
    await read(outbox);
  };

  const retry = async (id: string): Promise<void> => {
    if (outbox === null) return;
    try {
      await outbox.retryRejected(id);
      window.dispatchEvent(new CustomEvent<string>(LOCAL_CACHE_OUTBOX_RETRY_EVENT, { detail: id }));
    } catch (error) {
      browserLogger.error({ err: error }, 'A change that was not applied could not be put back to be sent again');
    }
    await read(outbox);
  };

  return { discard, items, retry };
};
