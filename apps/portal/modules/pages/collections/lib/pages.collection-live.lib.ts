import type { BlockCollectionMessage } from '../../block-sync/types/block-sync.types';
import type { CollectionRefreshCoalescer } from '../types/pages.collection-live.types';

/** Only a list of changed rows can be followed in place; anything else the server could not describe. */
export const routeCollectionMessage = (message: BlockCollectionMessage, hasFollowers: boolean): 'follow' | 'refresh' =>
  message.type === 'collection-changes' && hasFollowers ? 'follow' : 'refresh';

/** Whether a notice means the rows a browser holds may no longer be the ones the reader can see. */
export const readStaleRowsCause = (message: BlockCollectionMessage): null | string =>
  message.type === 'collection-resync' || message.type === 'collection-revoked' ? message.type : null;

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
