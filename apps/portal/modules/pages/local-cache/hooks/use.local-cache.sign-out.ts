'use client';

import type { FormEvent } from 'react';
import { useRef } from 'react';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { wipeBrowserLocalCaches } from '../lib/local-cache.browser.lib';
import { countBrowserPendingTransactions } from '../lib/local-cache.pending.lib';

const readPendingCount = async (): Promise<number> => {
  try {
    return await countBrowserPendingTransactions();
  } catch (error) {
    browserLogger.error({ err: error }, 'The writes waiting to be sent could not be counted before signing out');
    return 0;
  }
};

/**
 * Signing out empties what this browser kept of the person (ADR 029). Writes the server has not answered are lost
 * with it, so the person is told how many and decides: nothing leaves without them knowing.
 */
export const useLocalCacheSignOut = (
  describePending: (count: number) => string,
): ((event: FormEvent<HTMLFormElement>) => void) => {
  const isCleared = useRef(false);

  return (event) => {
    if (isCleared.current) return;
    event.preventDefault();
    const form = event.currentTarget;
    void (async () => {
      const pending = await readPendingCount();
      if (pending > 0 && !window.confirm(describePending(pending))) return;
      await wipeBrowserLocalCaches();
      isCleared.current = true;
      form.requestSubmit();
    })();
  };
};
