import { describe, expect, it } from 'bun:test';
import {
  BLOCK_LIVE_CLOSE_CODE,
  BLOCK_LIVE_MAX_BUFFERED_BYTES,
  BLOCK_LIVE_SOCKET_OPEN_STATE,
} from '@/modules/blocks/constants/block.live.constants';
import { toLiveSocket } from '@/modules/blocks/infrastructure/transport/block.live.transport';

const CLOSING_STATE = 2;

const buildRawSocket = (bufferedAmount: number, readyState: 1 | 2 = BLOCK_LIVE_SOCKET_OPEN_STATE) => {
  const sent: string[] = [];
  const closed: { code: number; reason: string }[] = [];
  const socket = {
    bufferedAmount,
    close: (code: number, reason: string) => {
      closed.push({ code, reason });
    },
    readyState,
    send: (text: string) => {
      sent.push(text);
    },
  };
  return { closed, sent, socket };
};

describe('toLiveSocket', () => {
  it('sends to a client that keeps up', () => {
    const raw = buildRawSocket(0);

    toLiveSocket(raw.socket).send('hello');

    expect(raw.sent).toEqual(['hello']);
    expect(raw.closed).toEqual([]);
  });

  it('closes a client that reads too slowly instead of holding every frame for it', () => {
    const raw = buildRawSocket(BLOCK_LIVE_MAX_BUFFERED_BYTES + 1);

    toLiveSocket(raw.socket).send('hello');

    expect(raw.sent).toEqual([]);
    expect(raw.closed).toEqual([{ code: BLOCK_LIVE_CLOSE_CODE.policyViolation, reason: 'slow-consumer' }]);
  });

  it('drops a send after the socket started closing', () => {
    const raw = buildRawSocket(0, CLOSING_STATE);

    toLiveSocket(raw.socket).send('hello');

    expect(raw.sent).toEqual([]);
    expect(raw.closed).toEqual([]);
  });
});
