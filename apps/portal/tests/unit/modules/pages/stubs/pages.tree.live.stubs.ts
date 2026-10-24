import type { BlockLiveSocket, BlockLiveSocketHandlers } from '@/modules/pages/block-sync/types/block-sync.types';

/** A socket that keeps what was sent to it and lets a test say what the server says. */
export interface FakeLiveSocket extends BlockLiveSocket {
  handlers: BlockLiveSocketHandlers | null;
  isClosed: boolean;
  readonly sent: Record<string, unknown>[];
}

export const buildFakeLiveSocket = (): FakeLiveSocket => {
  const fake: FakeLiveSocket = {
    close: () => {
      fake.isClosed = true;
    },
    handlers: null,
    isClosed: false,
    listen: (handlers) => {
      fake.handlers = handlers;
    },
    send: (text) => {
      fake.sent.push(JSON.parse(text) as Record<string, unknown>);
    },
    sent: [],
  };
  return fake;
};
