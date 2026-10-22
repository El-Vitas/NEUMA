import type { StoredTransaction } from '../../local-cache/types/local-cache.types';
import { pageViewWriteSchema } from '../schemas/pages.view-writes.schemas';
import type {
  PageViewWrite,
  ViewWriteQueueItem as QueueItem,
  ViewWriteQueue,
  ViewWriteQueueOptions,
  ViewWriteSendResult,
  ViewWriteSettled,
} from '../types/pages.view-writes.types';

const readStoredWrite = (stored: StoredTransaction): PageViewWrite | null => {
  const parsed = pageViewWriteSchema.safeParse(stored.operations[0]);
  return parsed.success ? parsed.data : null;
};

const isViewWriteOf = (stored: StoredTransaction, collectionId: string): boolean =>
  stored.kind === 'view-write' && stored.pageId === collectionId;

/**
 * Sends the changes of the views of a collection one after another. Each is on disk before it is sent and leaves the
 * disk only when the server has answered, so closing the tab or losing the network loses nothing; the id it is kept
 * under is the one every send carries. One the server refuses is set aside with its text, and the next goes on:
 * unlike the text of a document, the changes of cells and places do not rest on one another (ADR 029).
 */
export const createViewWriteQueue = (options: ViewWriteQueueOptions): ViewWriteQueue => {
  const { collectionId, outbox } = options;
  const items: QueueItem[] = [];
  const listeners = new Set<() => void>();
  /** Told apart from the disk's list, which may have been read just before the answer was written. */
  const answeredIds = new Set<string>();
  let lastStamp = 0;
  let isPumping = false;
  let failures = 0;
  let cancelRetry: (() => void) | null = null;

  const nextStamp = (): number => {
    lastStamp = Math.max(lastStamp + 1, Date.now());
    return lastStamp;
  };
  const announce = (): void => {
    for (const listener of listeners) listener();
  };

  const answer = (item: QueueItem, settled: ViewWriteSettled): void => {
    answeredIds.add(item.id);
    item.settle?.(settled);
    item.settle = null;
    options.onAnswered?.(item.id, item.write, settled);
  };

  const settleAsQueued = (item: QueueItem): void => {
    item.settle?.({ kind: 'queued' });
    item.settle = null;
  };

  const scheduleRetry = (): void => {
    cancelRetry?.();
    failures += 1;
    cancelRetry = options.scheduleRetry(() => {
      cancelRetry = null;
      void pump();
    }, failures);
  };

  /** The server answered the first write: it leaves the disk, or moves to the refused ones, and the next goes on. */
  const settleHead = async (
    head: QueueItem,
    result: Exclude<ViewWriteSendResult, { kind: 'offline' }>,
  ): Promise<void> => {
    failures = 0;
    if (result.kind === 'applied') await outbox.remove(head.id);
    else await outbox.markRejected(head.id, result.cause, result.message);
    items.shift();
    answer(head, result.kind === 'applied' ? { kind: 'applied' } : result);
    announce();
  };

  const drain = async (): Promise<void> => {
    for (let head = items[0]; head !== undefined; head = items[0]) {
      const result = await options.send(head.write);
      if (result.kind === 'offline') {
        settleAsQueued(head);
        scheduleRetry();
        return;
      }
      await settleHead(head, result);
    }
  };

  const pump = async (): Promise<void> => {
    if (isPumping) return;
    isPumping = true;
    try {
      await drain();
    } finally {
      isPumping = false;
    }
  };

  const restoreOne = async (stored: StoredTransaction): Promise<void> => {
    if (answeredIds.has(stored.id) || items.some((item) => item.id === stored.id)) return;
    const write = readStoredWrite(stored);
    if (write === null) {
      await outbox.markRejected(stored.id, 'invalid', 'It could not be read back');
      return;
    }
    items.push({ createdAt: stored.createdAt, id: stored.id, settle: null, write });
  };

  return {
    enqueue: async (write, description) => {
      const id = options.newId();
      const createdAt = nextStamp();
      await outbox.append({
        attempts: 0,
        createdAt,
        id,
        kind: 'view-write',
        operations: [write],
        ownerId: options.ownerId,
        pageId: collectionId,
        previews: [{ blockId: id, property: '', text: description }],
        spaceId: write.spaceId,
      });
      const settled = new Promise<ViewWriteSettled>((resolve) => {
        items.push({ createdAt, id, settle: resolve, write });
      });
      announce();
      void pump();
      return settled;
    },
    pendingCount: () => items.length,
    resume: async () => {
      const stored = (await outbox.listPending()).filter((candidate) => isViewWriteOf(candidate, collectionId));
      for (const candidate of stored) await restoreOne(candidate);
      items.sort((left, right) => left.createdAt - right.createdAt);
      announce();
      cancelRetry?.();
      cancelRetry = null;
      await pump();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
