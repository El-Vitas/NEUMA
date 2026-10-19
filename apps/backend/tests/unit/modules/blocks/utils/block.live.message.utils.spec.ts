import { describe, expect, it } from 'bun:test';
import { BLOCK_LIVE_TOKEN_MAX_LENGTH } from '@/modules/blocks/constants/block.live.constants';
import { BLOCK_ID_MAX_LENGTH } from '@/modules/blocks/constants/blocks.constants';
import type { BlockLiveClientMessage } from '@/modules/blocks/types/block.live.types';
import {
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
    });
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
