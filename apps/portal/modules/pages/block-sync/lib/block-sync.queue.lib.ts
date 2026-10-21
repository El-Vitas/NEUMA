import { computeCollaborationReconnectDelayMs } from '../../lib/pages.collaboration.lib';
import {
  BLOCK_SYNC_ERROR_CODE,
  BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS,
  BLOCK_SYNC_RATE_LIMIT_MAX_DELAY_MS,
} from '../constants/block-sync.constants';
import type {
  BlockQueuePersistence,
  BlockQueueState,
  BlockTransaction,
  BlockTransactionOutcome,
  BlockTransactionQueue,
  BlockTransactionQueueOptions,
  BlockSendResult as SendResult,
} from '../types/block-sync.types';
import { readRequestErrorCode } from './block-sync.errors.lib';

const computeRateLimitDelayMs = (attempt: number): number =>
  Math.min(BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS * 2 ** (Math.max(attempt, 1) - 1), BLOCK_SYNC_RATE_LIMIT_MAX_DELAY_MS);

const computeRetryDelayMs = (code: string, attempt: number): number =>
  code === BLOCK_SYNC_ERROR_CODE.rateLimited
    ? computeRateLimitDelayMs(attempt)
    : computeCollaborationReconnectDelayMs(attempt);

/**
 * Sends transactions in order, one at a time. A transaction that did not arrive is sent again with the same id,
 * which the server answers from what it stored. One the server refused is handed over and the queue holds the
 * rest until it is cleared, because they were built on what that one assumed.
 */
export const createTransactionQueue = ({
  handlers,
  persistence,
  send,
}: BlockTransactionQueueOptions): BlockTransactionQueue => {
  let items: BlockTransaction[] = [];
  /** Disk work in the order it was asked, so a transaction is on disk before it is sent and gone after it is done. */
  let writes: Promise<void> = Promise.resolve();
  let isSending = false;
  let isBlocked = false;
  let isDestroyed = false;
  let failures = 0;
  let wasOffline = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const emit = (state: BlockQueueState): void => handlers.onStateChange(state);

  /** The persistence reports its own failures, so a broken disk never stops the queue from sending. */
  const writeToDisk = (write: (disk: BlockQueuePersistence) => Promise<void>): void => {
    if (persistence === undefined) return;
    writes = writes.then(() => write(persistence)).catch(() => undefined);
  };

  const attempt = async (transaction: BlockTransaction): Promise<SendResult> => {
    try {
      return { kind: 'answered', outcome: await send(transaction) };
    } catch (error) {
      return { code: readRequestErrorCode(error), kind: 'failed' };
    }
  };

  const clearRetry = (): void => {
    if (retryTimer === null) return;
    clearTimeout(retryTimer);
    retryTimer = null;
  };

  const finishWhenEmpty = (): void => {
    emit(wasOffline ? 'backOnline' : 'idle');
    wasOffline = false;
  };

  const handleFailure = (code: string): void => {
    failures += 1;
    if (code !== BLOCK_SYNC_ERROR_CODE.rateLimited) {
      wasOffline = true;
      emit('offline');
    }
    retryTimer = setTimeout(
      () => {
        retryTimer = null;
        void pump();
      },
      computeRetryDelayMs(code, failures),
    );
  };

  /** False when the server refused it: the handler decides what follows, so the queue says nothing of being done. */
  const handleOutcome = (transaction: BlockTransaction, outcome: BlockTransactionOutcome): boolean => {
    failures = 0;
    items = items.filter((held) => held !== transaction);
    if ('error' in outcome) {
      const { error } = outcome;
      isBlocked = true;
      writeToDisk((disk) => disk.setAside(transaction, error));
      handlers.onRejected(transaction, error);
      return false;
    }
    writeToDisk((disk) => disk.drop(transaction.id));
    handlers.onApplied(transaction, outcome.blocks);
    return true;
  };

  const pump = async (): Promise<void> => {
    if (isSending || isBlocked || isDestroyed || retryTimer !== null || items.length === 0) return;
    isSending = true;
    emit('saving');
    await writes;
    const next = items[0];
    if (next === undefined || isDestroyed) {
      isSending = false;
      return;
    }
    const result = await attempt(next);
    isSending = false;
    if (isDestroyed) return;
    if (result.kind === 'failed') {
      handleFailure(result.code);
      return;
    }
    const wasApplied = handleOutcome(next, result.outcome);
    if (wasApplied && items.length === 0) finishWhenEmpty();
    void pump();
  };

  return {
    clear: () => {
      const dropped = items;
      items = [];
      isBlocked = false;
      failures = 0;
      clearRetry();
      for (const transaction of dropped) writeToDisk((disk) => disk.drop(transaction.id));
      return dropped;
    },
    destroy: () => {
      isDestroyed = true;
      clearRetry();
    },
    enqueue: (transaction) => {
      items = [...items, transaction];
      writeToDisk((disk) => disk.keep(transaction));
      void pump();
    },
    list: () => items,
    restore: (transactions) => {
      const restored = new Set(transactions.map((transaction) => transaction.id));
      items = [...transactions, ...items.filter((held) => !restored.has(held.id))];
      void pump();
    },
    resume: () => {
      clearRetry();
      void pump();
    },
    size: () => items.length,
  };
};
