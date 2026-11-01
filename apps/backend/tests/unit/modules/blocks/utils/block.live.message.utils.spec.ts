import { describe, expect, it } from 'bun:test';
import {
  BLOCK_LIVE_MAX_MESSAGE_BYTES,
  BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES,
  BLOCK_LIVE_REQUEST_ID_MAX_LENGTH,
  BLOCK_LIVE_TOKEN_MAX_LENGTH,
} from '@/modules/blocks/constants/block.live.constants';
import {
  BLOCK_OPERATIONS_MAX_PER_TRANSACTION,
  BLOCK_TRANSACTION_ID_MAX_LENGTH,
  BLOCK_TRANSACTIONS_MAX_PER_REQUEST,
} from '@/modules/blocks/constants/block.transaction.constants';
import {
  BLOCK_ID_MAX_LENGTH,
  BLOCK_SYNC_MAX_REQUESTED_BLOCKS,
  BLOCK_VERSION_MAX,
} from '@/modules/blocks/constants/blocks.constants';
import type { BlockLiveClientMessage } from '@/modules/blocks/types/block.live.types';
import {
  isMessageWithinSizeLimit,
  parseClientMessage,
  parseVersionNotification,
  serializeServerMessage,
} from '@/modules/blocks/utils/block.live.message.utils';

const PAGE_ID = '0198c5a0-0000-7000-8000-000000000001';
const BLOCK_ID = '0198c5a0-0000-7000-8000-000000000002';

describe('parseClientMessage', () => {
  it('accepts every message of the protocol', () => {
    const messages: BlockLiveClientMessage[] = [
      { token: 'a.b.c', type: 'auth' },
      { pageId: PAGE_ID, type: 'subscribe' },
      { pageId: PAGE_ID, type: 'unsubscribe' },
      { blockId: BLOCK_ID, pageId: PAGE_ID, type: 'presence' },
      { blockId: null, pageId: PAGE_ID, type: 'presence' },
      { type: 'ping' },
    ];

    for (const message of messages) {
      const parsed = parseClientMessage(JSON.stringify(message));

      expect(parsed.isFail()).toBe(false);
      expect(parsed.getValue()).toEqual(message);
    }
  });

  it('refuses text that is not JSON', () => {
    expect(parseClientMessage('not json').isFail()).toBe(true);
    expect(parseClientMessage('').isFail()).toBe(true);
  });

  it('refuses JSON that is not an object of the protocol', () => {
    const invalid = [
      'null',
      '[]',
      '"subscribe"',
      JSON.stringify({ type: 'unknown' }),
      JSON.stringify({ type: 'subscribe' }),
      JSON.stringify({ pageId: 12, type: 'subscribe' }),
      JSON.stringify({ pageId: '', type: 'subscribe' }),
      JSON.stringify({ pageId: PAGE_ID, type: 'presence' }),
      JSON.stringify({ blockId: 7, pageId: PAGE_ID, type: 'presence' }),
    ];

    for (const text of invalid) {
      expect(parseClientMessage(text).isFail()).toBe(true);
    }
  });

  it('refuses fields the protocol does not define', () => {
    expect(parseClientMessage(JSON.stringify({ extra: true, type: 'ping' })).isFail()).toBe(true);
    expect(parseClientMessage(JSON.stringify({ extra: 1, pageId: PAGE_ID, type: 'subscribe' })).isFail()).toBe(true);
  });

  it('bounds the length of ids and of the token', () => {
    const longId = 'x'.repeat(BLOCK_ID_MAX_LENGTH + 1);
    const longToken = 'x'.repeat(BLOCK_LIVE_TOKEN_MAX_LENGTH + 1);

    expect(parseClientMessage(JSON.stringify({ pageId: longId, type: 'subscribe' })).isFail()).toBe(true);
    expect(parseClientMessage(JSON.stringify({ blockId: longId, pageId: PAGE_ID, type: 'presence' })).isFail()).toBe(
      true,
    );
    expect(parseClientMessage(JSON.stringify({ token: longToken, type: 'auth' })).isFail()).toBe(true);
  });
});

describe('parseClientMessage requests', () => {
  const transaction = {
    id: 'transaction-1',
    operations: [{ args: {}, command: 'update', path: [], pointer: { id: BLOCK_ID, table: 'block' } }],
    spaceId: 'space-1',
  };

  it('accepts a transactions request and both shapes of a sync request', () => {
    const messages: BlockLiveClientMessage[] = [
      { requestId: 'request-1', transactions: [transaction], type: 'transactions' },
      { pageId: PAGE_ID, requestId: 'request-2', type: 'sync' },
      { blocks: [{ id: BLOCK_ID, version: 3 }], requestId: 'request-3', type: 'sync' },
    ];

    for (const message of messages) {
      expect(parseClientMessage(JSON.stringify(message)).getValue()).toEqual(message);
    }
  });

  it('refuses a request without a request id or with one that is too long', () => {
    const longId = 'x'.repeat(BLOCK_LIVE_REQUEST_ID_MAX_LENGTH + 1);

    expect(parseClientMessage(JSON.stringify({ pageId: PAGE_ID, type: 'sync' })).isFail()).toBe(true);
    expect(parseClientMessage(JSON.stringify({ pageId: PAGE_ID, requestId: '', type: 'sync' })).isFail()).toBe(true);
    expect(parseClientMessage(JSON.stringify({ pageId: PAGE_ID, requestId: longId, type: 'sync' })).isFail()).toBe(
      true,
    );
  });

  it('refuses a sync request that names both a page and blocks, or neither', () => {
    const both = { blocks: [{ id: BLOCK_ID, version: 1 }], pageId: PAGE_ID, requestId: 'request-1', type: 'sync' };

    expect(parseClientMessage(JSON.stringify(both)).isFail()).toBe(true);
    expect(parseClientMessage(JSON.stringify({ requestId: 'request-1', type: 'sync' })).isFail()).toBe(true);
    expect(parseClientMessage(JSON.stringify({ blocks: [], requestId: 'request-1', type: 'sync' })).isFail()).toBe(
      true,
    );
  });

  it('bounds a sync request to the same number of blocks as the HTTP endpoint', () => {
    const blocks = Array.from({ length: BLOCK_SYNC_MAX_REQUESTED_BLOCKS + 1 }, () => ({ id: BLOCK_ID, version: 1 }));

    expect(parseClientMessage(JSON.stringify({ blocks, requestId: 'request-1', type: 'sync' })).isFail()).toBe(true);
    expect(
      parseClientMessage(
        JSON.stringify({ blocks: [{ id: BLOCK_ID, version: BLOCK_VERSION_MAX + 1 }], requestId: 'r', type: 'sync' }),
      ).isFail(),
    ).toBe(true);
  });

  it('bounds transactions and operations to the same limits as the HTTP endpoint', () => {
    const tooManyTransactions = Array.from({ length: BLOCK_TRANSACTIONS_MAX_PER_REQUEST + 1 }, () => transaction);
    const tooManyOperations = Array.from({ length: BLOCK_OPERATIONS_MAX_PER_TRANSACTION + 1 }, () => ({}));
    const request = (transactions: unknown[]): string =>
      JSON.stringify({ requestId: 'request-1', transactions, type: 'transactions' });

    expect(parseClientMessage(request([])).isFail()).toBe(true);
    expect(parseClientMessage(request(tooManyTransactions)).isFail()).toBe(true);
    expect(parseClientMessage(request([{ ...transaction, operations: [] }])).isFail()).toBe(true);
    expect(parseClientMessage(request([{ ...transaction, operations: tooManyOperations }])).isFail()).toBe(true);
    expect(parseClientMessage(request([{ ...transaction, operations: ['update'] }])).isFail()).toBe(true);
    expect(
      parseClientMessage(request([{ ...transaction, id: 'x'.repeat(BLOCK_TRANSACTION_ID_MAX_LENGTH + 1) }])).isFail(),
    ).toBe(true);
    expect(parseClientMessage(request([{ ...transaction, extra: true }])).isFail()).toBe(true);
  });
});

describe('isMessageWithinSizeLimit', () => {
  const ping = parseClientMessage(JSON.stringify({ type: 'ping' }));
  const sync = parseClientMessage(JSON.stringify({ pageId: PAGE_ID, requestId: 'request-1', type: 'sync' }));

  it('allows any message up to the small limit', () => {
    expect(isMessageWithinSizeLimit(BLOCK_LIVE_MAX_MESSAGE_BYTES, ping)).toBe(true);
  });

  it('allows a request up to the request limit and nothing else above the small one', () => {
    expect(isMessageWithinSizeLimit(BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES, sync)).toBe(true);
    expect(isMessageWithinSizeLimit(BLOCK_LIVE_MAX_REQUEST_MESSAGE_BYTES + 1, sync)).toBe(false);
    expect(isMessageWithinSizeLimit(BLOCK_LIVE_MAX_MESSAGE_BYTES + 1, ping)).toBe(false);
  });

  it('refuses a message above the small limit that does not parse', () => {
    expect(isMessageWithinSizeLimit(BLOCK_LIVE_MAX_MESSAGE_BYTES + 1, parseClientMessage('x'))).toBe(false);
  });
});

describe('parseVersionNotification', () => {
  it('reads the blocks a committed transaction touched', () => {
    const payload = JSON.stringify({
      blocks: [{ id: BLOCK_ID, version: 4 }],
      spaceId: 'space-1',
      transactionId: 'transaction-1',
    });

    const parsed = parseVersionNotification(payload);

    expect(parsed.getValue()).toEqual({
      blocks: [{ id: BLOCK_ID, version: 4 }],
      kind: 'versions',
      spaceId: 'space-1',
      views: [],
    });
  });

  it('reads the views and the move or permission flags of a notification', () => {
    const payload = JSON.stringify({
      blocks: [{ hasAccessChange: true, id: BLOCK_ID, previousParentId: 'old', version: 4 }],
      spaceId: 'space-1',
      transactionId: 'transaction-1',
      views: [{ id: 'view-1', pageId: 'page-1', version: 2 }],
    });

    expect(parseVersionNotification(payload).getValue()).toEqual({
      blocks: [{ hasAccessChange: true, id: BLOCK_ID, previousParentId: 'old', version: 4 }],
      kind: 'versions',
      spaceId: 'space-1',
      views: [{ id: 'view-1', pageId: 'page-1', version: 2 }],
    });
  });

  it('reads the collection messages of a client', () => {
    expect(parseClientMessage(JSON.stringify({ collectionId: 'c1', type: 'subscribe-collection' })).isOk()).toBe(true);
    expect(parseClientMessage(JSON.stringify({ collectionId: 'c1', type: 'unsubscribe-collection' })).isOk()).toBe(
      true,
    );
    expect(parseClientMessage(JSON.stringify({ type: 'subscribe-collection' })).isFail()).toBe(true);
  });

  it('reads a truncated notification as one that carries no blocks', () => {
    const payload = JSON.stringify({ spaceId: 'space-1', transactionId: 'transaction-1', truncated: true });

    expect(parseVersionNotification(payload).getValue()).toEqual({ kind: 'truncated', spaceId: 'space-1' });
  });

  it('refuses a payload it does not understand', () => {
    expect(parseVersionNotification('nope').isFail()).toBe(true);
    expect(parseVersionNotification(JSON.stringify({ transactionId: 'transaction-1' })).isFail()).toBe(true);
    expect(
      parseVersionNotification(
        JSON.stringify({ blocks: [{ id: 1 }], spaceId: 'space-1', transactionId: 't' }),
      ).isFail(),
    ).toBe(true);
  });
});

describe('serializeServerMessage', () => {
  it('writes the message as JSON text', () => {
    expect(serializeServerMessage({ pageId: PAGE_ID, type: 'resync' })).toBe(
      JSON.stringify({ pageId: PAGE_ID, type: 'resync' }),
    );
  });
});
