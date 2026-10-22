import type { RejectedCause, StoredTransaction } from '../../local-cache/types/local-cache.types';
import { BLOCK_SYNC_FORBIDDEN_ERROR_CODES } from '../constants/block-sync.constants';
import { blockWireOperationSchema } from '../schemas/block-sync.schemas';
import type {
  BlockSyncDeferredOutboxOptions,
  BlockSyncOutbox,
  BlockSyncOutboxOptions,
  BlockTransaction,
  BlockTransactionError,
  BlockWireOperation,
} from '../types/block-sync.types';

const readCause = (error: BlockTransactionError): RejectedCause =>
  BLOCK_SYNC_FORBIDDEN_ERROR_CODES.includes(error.code) ? 'forbidden' : 'other';

const readOperations = (stored: StoredTransaction): readonly BlockWireOperation[] | null => {
  const operations: BlockWireOperation[] = [];
  for (const candidate of stored.operations) {
    const parsed = blockWireOperationSchema.safeParse(candidate);
    if (!parsed.success) return null;
    operations.push({ ...parsed.data, args: parsed.data.args });
  }
  return operations;
};

/** Connects the queue of a page to the local cache: its transactions survive closing the tab (ADR 029). */
export const createBlockSyncOutbox = ({
  onSetAside,
  outbox,
  ownerId,
  pageId,
  report,
}: BlockSyncOutboxOptions): BlockSyncOutbox => {
  let lastStamp = 0;
  const nextStamp = (): number => {
    lastStamp = Math.max(lastStamp + 1, Date.now());
    return lastStamp;
  };

  const attempt = async (message: string, work: () => Promise<void>): Promise<void> => {
    try {
      await work();
    } catch (error) {
      report(message, error);
    }
  };

  const setAsideUnreadable = async (stored: StoredTransaction): Promise<void> => {
    report(`A transaction kept on disk could not be read and was set aside (${stored.id})`);
    await attempt('A transaction could not be set aside', async () => {
      await outbox.markRejected(stored.id, 'invalid', 'It could not be read back');
      onSetAside?.();
    });
  };

  const restoreOne = async (stored: StoredTransaction): Promise<BlockTransaction | null> => {
    const operations = readOperations(stored);
    if (operations === null) {
      await setAsideUnreadable(stored);
      return null;
    }
    return { id: stored.id, operations, spaceId: stored.spaceId };
  };

  return {
    drop: (transactionId) => attempt('A transaction could not be forgotten', () => outbox.remove(transactionId)),
    keep: (transaction, previews) =>
      attempt('A transaction could not be kept on disk', () =>
        outbox.append({
          attempts: 0,
          createdAt: nextStamp(),
          id: transaction.id,
          operations: transaction.operations,
          ownerId,
          pageId,
          previews,
          spaceId: transaction.spaceId,
        }),
      ),
    setAside: (transaction, error) =>
      attempt('A refused transaction could not be set aside', async () => {
        await outbox.markRejected(transaction.id, readCause(error), error.message);
        onSetAside?.();
      }),
    restore: async () => {
      try {
        const pending = (await outbox.listPending()).filter(
          (stored) => stored.pageId === pageId && (stored.kind ?? 'blocks') === 'blocks',
        );
        const restored = await Promise.all(pending.map(restoreOne));
        return restored.filter((transaction): transaction is BlockTransaction => transaction !== null);
      } catch (error) {
        report('The transactions kept on disk could not be read', error);
        return [];
      }
    },
  };
};

/**
 * The same outbox for a disk still being opened: what is asked meanwhile waits for it. A disk that cannot be
 * opened is reported once, and the page goes on without keeping anything, as it did before there was a disk.
 */
export const createDeferredBlockSyncOutbox = ({
  opening,
  ...options
}: BlockSyncDeferredOutboxOptions): BlockSyncOutbox => {
  const ready = opening
    .then((outbox) => createBlockSyncOutbox({ ...options, outbox }))
    .catch((error: unknown) => {
      options.report('The disk of the outbox could not be opened', error);
      return null;
    });

  return {
    drop: async (transactionId) => (await ready)?.drop(transactionId),
    keep: async (transaction, previews) => (await ready)?.keep(transaction, previews),
    restore: async () => (await ready)?.restore() ?? [],
    setAside: async (transaction, error) => (await ready)?.setAside(transaction, error),
  };
};
