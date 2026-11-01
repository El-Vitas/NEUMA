import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import {
  BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS,
  BLOCK_SYNC_RATE_LIMIT_MAX_DELAY_MS,
} from '@/modules/pages/block-sync/constants/block-sync.constants';
import { BlockLiveRequestError } from '@/modules/pages/block-sync/lib/block-sync.errors.lib';
import { buildSetOperation } from '@/modules/pages/block-sync/lib/block-sync.operations.lib';
import { createTransactionQueue } from '@/modules/pages/block-sync/lib/block-sync.queue.lib';
import type {
  BlockQueueState,
  BlockTransaction,
  BlockTransactionError,
  BlockTransactionOutcome,
  BlockVersion,
} from '@/modules/pages/block-sync/types/block-sync.types';
import { computeCollaborationReconnectDelayMs } from '@/modules/pages/lib/pages.collaboration.lib';
import type { PendingSend } from '../block-sync.test.types';

const transaction = (id: string): BlockTransaction => ({
  id,
  operations: [buildSetOperation(id, { id })],
  spaceId: 'space-1',
});

const createHarness = () => {
  const sent: PendingSend[] = [];
  const applied: string[] = [];
  const rejected: { readonly error: BlockTransactionError; readonly id: string }[] = [];
  const states: BlockQueueState[] = [];
  const queue = createTransactionQueue({
    handlers: {
      onApplied: (applyiedTransaction: BlockTransaction, _blocks: readonly BlockVersion[]) =>
        applied.push(applyiedTransaction.id),
      onRejected: (rejectedTransaction, error) => rejected.push({ error, id: rejectedTransaction.id }),
      onStateChange: (state) => states.push(state),
    },
    send: (nextTransaction) =>
      new Promise<BlockTransactionOutcome>((resolve, reject) => {
        sent.push({ reject, resolve, transaction: nextTransaction });
      }),
  });
  return { applied, queue, rejected, sent, states };
};

const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
};

const succeed = async (pending: PendingSend | undefined): Promise<void> => {
  pending?.resolve({ blocks: [{ id: 'x', version: 1 }], id: pending.transaction.id });
  await flush();
};

const failWith = async (pending: PendingSend | undefined, code: string): Promise<void> => {
  pending?.reject(new BlockLiveRequestError(code));
  await flush();
};

describe('createTransactionQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('sends one transaction at a time, in the order they were queued', async () => {
    const { queue, sent } = createHarness();

    queue.enqueue(transaction('t1'));
    queue.enqueue(transaction('t2'));
    await flush();

    expect(sent.map((pending) => pending.transaction.id)).toEqual(['t1']);
    await succeed(sent[0]);
    expect(sent.map((pending) => pending.transaction.id)).toEqual(['t1', 't2']);
  });

  it('reports each applied transaction with the versions the server answered', async () => {
    const { applied, queue, sent } = createHarness();
    queue.enqueue(transaction('t1'));
    await flush();

    await succeed(sent[0]);

    expect(applied).toEqual(['t1']);
    expect(queue.size()).toBe(0);
  });

  it('sends the same transaction again, with the same id, when the network failed', async () => {
    const { queue, sent } = createHarness();
    queue.enqueue(transaction('t1'));
    await flush();

    await failWith(sent[0], 'closed');
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();

    expect(sent.map((pending) => pending.transaction.id)).toEqual(['t1', 't1']);
    expect(sent[1]?.transaction).toBe(sent[0]?.transaction);
  });

  it('waits longer after each failure in a row', async () => {
    const { queue, sent } = createHarness();
    queue.enqueue(transaction('t1'));
    await flush();
    await failWith(sent[0], 'timeout');
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();
    await failWith(sent[1], 'timeout');

    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(2) - 1);
    await flush();
    expect(sent).toHaveLength(2);

    jest.advanceTimersByTime(1);
    await flush();
    expect(sent).toHaveLength(3);
  });

  it('sends again at once when told the connection is back', async () => {
    const { queue, sent } = createHarness();
    queue.enqueue(transaction('t1'));
    await flush();
    await failWith(sent[0], 'closed');

    queue.resume();
    await flush();

    expect(sent).toHaveLength(2);
  });

  it('backs off when rate limited, doubling up to a maximum', async () => {
    const { queue, sent } = createHarness();
    queue.enqueue(transaction('t1'));
    await flush();

    await failWith(sent[0], 'rate-limited');
    jest.advanceTimersByTime(BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS - 1);
    await flush();
    expect(sent).toHaveLength(1);
    jest.advanceTimersByTime(1);
    await flush();
    expect(sent).toHaveLength(2);

    await failWith(sent[1], 'rate-limited');
    jest.advanceTimersByTime(BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS * 2);
    await flush();
    expect(sent).toHaveLength(3);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await failWith(sent.at(-1), 'rate-limited');
      jest.advanceTimersByTime(BLOCK_SYNC_RATE_LIMIT_MAX_DELAY_MS);
      await flush();
    }
    const lengthAtMaximum = sent.length;
    await failWith(sent.at(-1), 'rate-limited');
    jest.advanceTimersByTime(BLOCK_SYNC_RATE_LIMIT_MAX_DELAY_MS);
    await flush();
    expect(sent).toHaveLength(lengthAtMaximum + 1);
  });

  it('hands over a transaction the server refused and holds the rest until cleared', async () => {
    const { queue, rejected, sent } = createHarness();
    queue.enqueue(transaction('t1'));
    queue.enqueue(transaction('t2'));
    await flush();

    sent[0]?.resolve({ error: { code: 'BLOCK_TEXT_OUT_OF_SYNC', message: 'Sync' }, id: 't1' });
    await flush();

    expect(rejected).toEqual([{ error: { code: 'BLOCK_TEXT_OUT_OF_SYNC', message: 'Sync' }, id: 't1' }]);
    expect(sent).toHaveLength(1);
    expect(queue.list().map((held) => held.id)).toEqual(['t2']);

    expect(queue.clear().map((held) => held.id)).toEqual(['t2']);
    queue.enqueue(transaction('t3'));
    await flush();
    expect(sent.map((pending) => pending.transaction.id)).toEqual(['t1', 't3']);
  });

  it('shows saving while sending, offline while failing and back online once it recovers', async () => {
    const { queue, sent, states } = createHarness();
    queue.enqueue(transaction('t1'));
    await flush();
    await failWith(sent[0], 'closed');
    queue.resume();
    await flush();

    await succeed(sent[1]);

    expect(states).toEqual(['saving', 'offline', 'saving', 'backOnline']);
  });

  it('shows idle once everything was saved', async () => {
    const { queue, sent, states } = createHarness();
    queue.enqueue(transaction('t1'));
    await flush();

    await succeed(sent[0]);

    expect(states).toEqual(['saving', 'idle']);
  });

  it('never says idle after a refusal, even when the handler empties the queue', async () => {
    const states: BlockQueueState[] = [];
    const sent: PendingSend[] = [];
    const queue = createTransactionQueue({
      handlers: {
        onApplied: () => undefined,
        onRejected: () => {
          queue.clear();
        },
        onStateChange: (state) => states.push(state),
      },
      send: (nextTransaction) =>
        new Promise<BlockTransactionOutcome>((resolve, reject) => {
          sent.push({ reject, resolve, transaction: nextTransaction });
        }),
    });
    queue.enqueue(transaction('t1'));
    await flush();

    sent[0]?.resolve({
      error: { code: 'BLOCK_ALREADY_EXISTS', details: { detail: 'p3' }, message: 'Refused' },
      id: 't1',
    });
    await flush();

    expect(states).toEqual(['saving']);
  });

  it('sends nothing more after it was destroyed', async () => {
    const { queue, sent } = createHarness();
    queue.enqueue(transaction('t1'));
    await flush();
    await failWith(sent[0], 'closed');

    queue.destroy();
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();

    expect(sent).toHaveLength(1);
  });
});

const createPersistentHarness = () => {
  const log: string[] = [];
  const sent: PendingSend[] = [];
  const queue = createTransactionQueue({
    handlers: {
      onApplied: () => undefined,
      onRejected: () => undefined,
      onStateChange: () => undefined,
    },
    persistence: {
      drop: (id) => {
        log.push(`drop ${id}`);
        return Promise.resolve();
      },
      keep: (kept) => {
        log.push(`keep ${kept.id}`);
        return Promise.resolve();
      },
      setAside: (aside, error) => {
        log.push(`aside ${aside.id} ${error.code}`);
        return Promise.resolve();
      },
    },
    send: (nextTransaction) =>
      new Promise<BlockTransactionOutcome>((resolve, reject) => {
        log.push(`send ${nextTransaction.id}`);
        sent.push({ reject, resolve, transaction: nextTransaction });
      }),
  });
  return { log, queue, sent };
};

describe('createTransactionQueue with persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('keeps a transaction on disk before it is sent', async () => {
    const { log, queue } = createPersistentHarness();

    queue.enqueue(transaction('t1'));
    await flush();

    expect(log).toEqual(['keep t1', 'send t1']);
  });

  it('forgets a transaction once the server answered it', async () => {
    const { log, queue, sent } = createPersistentHarness();
    queue.enqueue(transaction('t1'));
    await flush();

    await succeed(sent[0]);

    expect(log).toEqual(['keep t1', 'send t1', 'drop t1']);
  });

  it('keeps a transaction on disk while the network is down and sends it again with the same id', async () => {
    const { log, queue, sent } = createPersistentHarness();
    queue.enqueue(transaction('t1'));
    await flush();

    await failWith(sent[0], 'closed');
    jest.advanceTimersByTime(computeCollaborationReconnectDelayMs(1));
    await flush();

    expect(log).toEqual(['keep t1', 'send t1', 'send t1']);
  });

  it('sets a refused transaction aside instead of dropping it', async () => {
    const { log, queue, sent } = createPersistentHarness();
    queue.enqueue(transaction('t1'));
    await flush();

    sent[0]?.resolve({ error: { code: 'FORBIDDEN', message: 'no' }, id: 't1' });
    await flush();

    expect(log).toEqual(['keep t1', 'send t1', 'aside t1 FORBIDDEN']);
  });

  it('sets aside everything still waiting when told to, instead of dropping it', async () => {
    const { log, queue, sent } = createPersistentHarness();
    queue.enqueue(transaction('t1'));
    queue.enqueue(transaction('t2'));
    await flush();

    sent[0]?.resolve({ error: { code: 'FORBIDDEN', message: 'no' }, id: 't1' });
    await flush();
    queue.setAsideAll({ code: 'FORBIDDEN', message: 'no' });
    await flush();

    expect(queue.size()).toBe(0);
    expect(log).toContain('aside t2 FORBIDDEN');
    expect(log).not.toContain('drop t2');
  });

  it('sends what was left on disk before what was queued since, without keeping it again', async () => {
    const { log, queue, sent } = createPersistentHarness();
    queue.enqueue(transaction('new'));
    queue.restore([transaction('old-1'), transaction('old-2')]);
    await flush();

    expect(sent.map((pending) => pending.transaction.id)).toEqual(['old-1']);
    await succeed(sent[0]);
    await succeed(sent[1]);
    await succeed(sent[2]);

    expect(sent.map((pending) => pending.transaction.id)).toEqual(['old-1', 'old-2', 'new']);
    expect(log.filter((entry) => entry.startsWith('keep'))).toEqual(['keep new']);
    expect(log.filter((entry) => entry.startsWith('drop'))).toEqual(['drop old-1', 'drop old-2', 'drop new']);
  });
});
