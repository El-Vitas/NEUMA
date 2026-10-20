import { computeCollaborationReconnectDelayMs } from '../../lib/pages.collaboration.lib';
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
  BlockLiveSocket,
  BlockPendingRequest as PendingRequest,
} from '../types/block-sync.types';
import { BlockLiveRequestError } from './block-sync.errors.lib';

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
  handlers,
  openSocket,
  pageId,
  requestToken,
  url,
}: BlockLiveSessionOptions): BlockLiveSession => {
  let socket: BlockLiveSocket | null = null;
  let isReady = false;
  let isDestroyed = false;
  let attempts = 0;
  let requestCounter = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  const pending = new Map<string, PendingRequest>();

  const send = (message: Record<string, unknown>): void => socket?.send(JSON.stringify(message));

  const stopPing = (): void => {
    if (pingTimer === null) return;
    clearInterval(pingTimer);
    pingTimer = null;
  };

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
    attempts = 0;
    stopPing();
    pingTimer = setInterval(() => send({ type: 'ping' }), BLOCK_SYNC_PING_INTERVAL_MS);
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
        send({ pageId, type: 'subscribe' });
        return;
      case 'subscribed':
        handleSubscribed();
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
      case 'presence':
        handlers.onPresence(message.users);
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

  const scheduleReconnect = (minimumDelayMs: number): void => {
    if (isDestroyed) return;
    attempts += 1;
    handlers.onStatusChange('reconnecting');
    const delay = Math.max(computeCollaborationReconnectDelayMs(attempts), minimumDelayMs);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  };

  const handleClose = (closed: BlockLiveSocket, code: number): void => {
    if (socket !== closed || isDestroyed) return;
    socket = null;
    isReady = false;
    stopPing();
    failAllRequests();
    handlers.onDisconnected();
    if (code === BLOCK_SYNC_CLOSE_CODE.unauthorized) {
      handlers.onStatusChange('error');
      return;
    }
    if (code === BLOCK_SYNC_CLOSE_CODE.reconnectRequired) {
      handlers.onStatusChange('reconnecting');
      void connect();
      return;
    }
    scheduleReconnect(isRateLimitClose(code) ? BLOCK_SYNC_RATE_LIMIT_BASE_DELAY_MS : 0);
  };

  const fetchToken = async (): Promise<string | null> => {
    try {
      return await requestToken();
    } catch {
      return null;
    }
  };

  const connect = async (): Promise<void> => {
    if (isDestroyed) return;
    if (attempts === 0) handlers.onStatusChange('connecting');
    const token = await fetchToken();
    if (isDestroyed) return;
    if (token === null) {
      scheduleReconnect(0);
      return;
    }
    const opened = openSocket(url);
    socket = opened;
    opened.listen({
      onClose: (code) => handleClose(opened, code),
      onMessage: handleMessage,
      onOpen: () => send({ token, type: 'auth' }),
    });
  };

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

  void connect();

  return {
    destroy: () => {
      isDestroyed = true;
      isReady = false;
      stopPing();
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      failAllRequests();
      socket?.close();
      socket = null;
    },
    request,
    sendPresence: (blockId) => {
      if (isReady) send({ blockId, pageId, type: 'presence' });
    },
  };
};
