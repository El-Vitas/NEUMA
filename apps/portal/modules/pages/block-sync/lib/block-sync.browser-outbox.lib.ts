import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { LOCAL_CACHE_OUTBOX_CHANGED_EVENT } from '../../local-cache/constants/local-cache.constants';
import { openBrowserLocalCache } from '../../local-cache/lib/local-cache.browser.lib';
import type { CacheableBody } from '../../local-cache/types/local-cache.types';
import type { BlockSyncOutbox } from '../types/block-sync.types';
import { createDeferredBlockSyncOutbox } from './block-sync.outbox.lib';

/** The outbox of one page of one person in this browser, on its way to being open. */
export const openBrowserBlockSyncOutbox = (userId: string, pageId: string): BlockSyncOutbox =>
  createDeferredBlockSyncOutbox({
    onSetAside: () => {
      window.dispatchEvent(new Event(LOCAL_CACHE_OUTBOX_CHANGED_EVENT));
    },
    opening: openBrowserLocalCache<CacheableBody>(userId).then((opened) => opened.outbox),
    ownerId: crypto.randomUUID(),
    pageId,
    report: (message, error) => browserLogger.error({ err: error }, message),
  });
