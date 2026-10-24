import {
  BLOCK_SYNC_ACCESS_DENIED_CODE,
  BLOCK_SYNC_CLOSE_CODE,
  BLOCK_SYNC_PING_INTERVAL_MS,
  BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS,
  BLOCK_SYNC_REQUEST_TIMEOUT_MS,
} from '../constants/block-sync.constants';
import { blockLiveServerMessageSchema } from '../schemas/block-sync.schemas';
import type {
  BlockLiveReply,
  BlockLiveRequestMessage,
  BlockLiveServerMessage,
  BlockLiveSession,
  BlockLiveSessionOptions,
  LiveSocketLoop,
  BlockPendingRequest as PendingRequest,
} from '../types/block-sync.types';
import { BlockLiveRequestError } from './block-sync.errors.lib';
import { createLiveSocketLoop } from './block-sync.live-socket.lib';

const parseServerMessage = (text: string): BlockLiveServerMessage | null => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = blockLiveServerMessageSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

const isRateLimitClose = (code: number): boolean =>
  code === BLOCK_SYNC_CLOSE_CODE.tooManyConnections || code === BLOCK_SYNC_CLOSE_CODE.policyViolation;

/**
 * One socket to the live channel for one page. Every connection asks for a fresh token, since a token is only
 * good for opening the socket. Requests are matched to their answers by id; a closed socket fails them all.
 */
export const createBlockLiveSession = ({
  collectionId,
  handlers,
  onCollectionMessage,
  onAccessChanged,
  onDiscussionChanged,
  openSocket,
  pageId,
  requestToken,
  url,
}: BlockLiveSessionOptions): BlockLiveSession => {
  let isReady = false;
  let requestCounter = 0;
  const pending = new Map<string, PendingRequest>();

  const failAllRequests = (): void => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new BlockLiveRequestError('closed'));
    }
    pending.clear();
  };

  const settleRequest = (requestId: string, settle: (request: PendingRequest) => void): void => {
    const request = pending.get(requestId);
    if (request === undefined) return;
    pending.delete(requestId);
    clearTimeout(request.timer);
    settle(request);
  };

  const handleSubscribed = (): void => {
    isReady = true;
    loop.markReady();
    handlers.onStatusChange('connected');
    handlers.onConnected();
  };

  const handleError = (message: Extract<BlockLiveServerMessage, { type: 'error' }>): void => {
    if (message.requestId !== undefined) {
      const code = message.code;
      settleRequest(message.requestId, (request) => request.reject(new BlockLiveRequestError(code)));
      return;
    }
    if (message.code === BLOCK_SYNC_ACCESS_DENIED_CODE) handlers.onRevoked();
  };

  const handleMessage = (text: string): void => {
    const message = parseServerMessage(text);
    if (message === null) return;
    switch (message.type) {
      case 'ready':
        send(
          collectionId === undefined ? { pageId, type: 'subscribe' } : { collectionId, type: 'subscribe-collection' },
        );
        return;
      case 'subscribed':
      case 'subscribed-collection':
        handleSubscribed();
        return;
      case 'collection-changes':
      case 'collection-resync':
      case 'collection-revoked':
        onCollectionMessage?.(message);
        return;
      case 'versions':
        handlers.onVersions(message.blocks);
        return;
      case 'resync':
        handlers.onResync();
        return;
      case 'revoked':
        handlers.onRevoked();
        return;
      case 'access-changed':
        onAccessChanged?.();
        return;
      case 'presence':
        handlers.onPresence(message.users);
        return;
      case 'discussion':
        onDiscussionChanged?.();
        return;
      case 'transactionsResult':
        settleRequest(message.requestId, (request) =>
          request.resolve({ transactions: message.transactions, type: 'transactionsResult' }),
        );
        return;
      case 'syncResult':
        settleRequest(message.requestId, (request) =>
          request.resolve({
            blocks: message.blocks,
            ...(message.revoked === undefined ? {} : { revoked: message.revoked }),
            type: 'syncResult',
          }),
        );
        return;
      case 'error':
        handleError(message);
        return;
      default:
        return;
    }
  };

  const handleClosed = (code: number, closedLoop: LiveSocketLoop): void => {
    isReady = false;
    failAllRequests();
    handlers.onDisconnected();
    if (code === BLOCK_SYNC_CLOSE_CODE.unauthorized) {
      handlers.onStatusChange('error');
      return;
    }
    if (code === BLOCK_SYNC_CLOSE_CODE.reconnectRequired) {
      handlers.onStatusChange('reconnecting');
      closedLoop.reconnectForced();
      return;
    }
    closedLoop.reconnectLater(isRateLimitClose(code) ? BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS : 0);
  };

  const loop = createLiveSocketLoop({
    onClosed: handleClosed,
    onConnectStart: (attempts) => {
      if (attempts === 0) handlers.onStatusChange('connecting');
    },
    onMessage: handleMessage,
    onReconnectScheduled: () => handlers.onStatusChange('reconnecting'),
    openSocket,
    pingIntervalMs: BLOCK_SYNC_PING_INTERVAL_MS,
    requestToken,
    url,
  });
  const send = loop.send;

  const request = (message: BlockLiveRequestMessage): Promise<BlockLiveReply> => {
    if (!isReady) return Promise.reject(new BlockLiveRequestError('closed'));
    requestCounter += 1;
    const requestId = `r${String(requestCounter)}`;
    return new Promise<BlockLiveReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new BlockLiveRequestError('timeout'));
      }, BLOCK_SYNC_REQUEST_TIMEOUT_MS);
      pending.set(requestId, { reject, resolve, timer });
      send({ ...message, requestId });
    });
  };

  void loop.connect();

  return {
    destroy: () => {
      isReady = false;
      failAllRequests();
      loop.destroy();
    },
    request,
    sendPresence: (blockId) => {
      if (isReady) send({ blockId, pageId, type: 'presence' });
    },
  };
};
