import type { StoredTransaction } from '../../local-cache/types/local-cache.types';
import { STORAGE_REFUSED_WRITE_MESSAGE, VIEW_WRITE_MAXIMUM_ATTEMPTS } from '../constants/pages.view-writes.constants';
import { pageViewWriteSchema } from '../schemas/pages.view-writes.schemas';
import type {
  PageViewWrite,
  ViewWriteQueueItem as QueueItem,
  ViewWriteQueue,
  ViewWriteQueueOptions,
  ViewWriteSendResult,
  ViewWriteSettled,
  ViewWriteVerdict,
} from '../types/pages.view-writes.types';
import { withoutExpectedVersion } from './pages.view-writes.versioning.lib';

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
  /** Writes the person asked to send again: they go without the version that made the server refuse them. */
  const putBackIds = new Set<string>();
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
  const settleHead = async (head: QueueItem, result: ViewWriteVerdict): Promise<void> => {
    failures = 0;
    if (result.kind === 'applied') await outbox.remove(head.id);
    else await outbox.markRejected(head.id, result.cause, result.message);
    items.shift();
    answer(head, result.kind === 'applied' ? { kind: 'applied' } : result);
    announce();
  };

  /** What the server decided about a write, or null when the write must wait for another try. */
  const readVerdict = (head: QueueItem, result: ViewWriteSendResult): ViewWriteVerdict | null => {
    if (result.kind === 'offline') return null;
    if (result.kind !== 'retry') return result;
    head.failedAttempts += 1;
    if (head.failedAttempts < VIEW_WRITE_MAXIMUM_ATTEMPTS) return null;
    return { cause: result.cause, kind: 'rejected', message: result.message };
  };

  const drain = async (): Promise<void> => {
    for (let head = items[0]; head !== undefined; head = items[0]) {
      const verdict = readVerdict(head, await options.send(head.write));
      if (verdict === null) {
        settleAsQueued(head);
        scheduleRetry();
        return;
      }
      await settleHead(head, verdict);
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
    items.push({
      createdAt: stored.createdAt,
      failedAttempts: 0,
      id: stored.id,
      settle: null,
      write: putBackIds.has(stored.id) ? withoutExpectedVersion(write) : write,
    });
  };

  return {
    enqueue: async (write, description) => {
      const id = options.newId();
      const createdAt = nextStamp();
      try {
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
      } catch (error) {
        options.onStorageFailure?.(error);
        const refused: ViewWriteSettled = { cause: 'other', kind: 'rejected', message: STORAGE_REFUSED_WRITE_MESSAGE };
        options.onAnswered?.(id, write, refused);
        return refused;
      }
      const settled = new Promise<ViewWriteSettled>((resolve) => {
        items.push({ createdAt, failedAttempts: 0, id, settle: resolve, write });
      });
      announce();
      void pump();
      return settled;
    },
    pendingCount: () => items.length,
    release: (id) => {
      answeredIds.delete(id);
      putBackIds.add(id);
    },
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
