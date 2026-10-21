import type { CollectionRefreshCoalescer } from '../types/pages.collection-live.types';

/**
 * Turns a burst of change notices into one refresh. A notice that arrives while a refresh is running is kept and
 * answered by one more refresh after it, so the view never reads twice at the same time.
 */
export const createCollectionRefreshCoalescer = (
  refresh: () => Promise<void> | void,
  delayMs: number,
): CollectionRefreshCoalescer => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;
  let isAgainWanted = false;

  const run = async (): Promise<void> => {
    timer = null;
    isRunning = true;
    try {
      await refresh();
    } finally {
      isRunning = false;
    }
    if (isAgainWanted) {
      isAgainWanted = false;
      timer = setTimeout(() => void run(), delayMs);
    }
  };

  return {
    cancel: () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      isAgainWanted = false;
    },
    request: () => {
      if (isRunning) {
        isAgainWanted = true;
        return;
      }
      timer ??= setTimeout(() => void run(), delayMs);
    },
  };
};
