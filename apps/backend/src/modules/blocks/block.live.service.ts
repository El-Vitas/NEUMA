import { Inject, Injectable } from '@nestjs/common';
import type { Result } from '@neuma/shared';
import { PinoLogger } from 'nestjs-pino';
import { BlockLiveAccessService } from './block.live.access.service';
import { BlockLiveFanoutService } from './block.live.fanout.service';
import { BlockLiveRequestService } from './block.live.request.service';
import { BlockLiveTokenService } from './block.live.token.service';
import {
  BLOCK_LIVE_CLOSE_CODE,
  BLOCK_LIVE_MAX_CONNECTIONS_PER_USER,
  BLOCK_LIVE_MAX_MESSAGE_BYTES,
  BLOCK_LIVE_MAX_SUBSCRIPTIONS_PER_CONNECTION,
  BLOCK_LIVE_RATE_LIMIT,
  BLOCK_LIVE_SETTINGS,
  BLOCK_PRESENCE_STORE,
} from './constants/block.live.constants';
import { BLOCK_LIVE_ERROR_CODE } from './domain/block.live.constants';
import type { LiveErrorCode, LiveServerMessage } from './domain/block.live.domain.types';
import type { BlockLiveInvalidMessageError } from './domain/block.live.error';
import { registerMessage } from './domain/block.live.rate.domain';
import { BlockLiveRegistry } from './infrastructure/registry/block.live.registry';
import type {
  BlockLiveBroadcaster,
  BlockLiveClientMessage,
  BlockLiveConnection,
  BlockLiveLogger,
  BlockLivePageAccess,
  BlockLivePresenceMessage,
  BlockLiveReplyMessage,
  BlockLiveRequestAnswerer,
  BlockLiveRequestMessage,
  BlockLiveSettings,
  BlockLiveSocket,
  BlockLiveSocketHandler,
  BlockLiveTokenVerifier,
  BlockPresenceStore,
} from './types/block.live.types';
import type { BlockReader } from './types/blocks.types';
import { isMessageWithinSizeLimit, parseClientMessage, serializeServerMessage } from './utils/block.live.message.utils';

/** One socket at a time: authenticates it, keeps its subscriptions and presence, and enforces the caps. */
@Injectable()
export class BlockLiveService {
  private isStopped = false;

  constructor(
    @Inject(BlockLiveRegistry) private readonly registry: BlockLiveRegistry,
    @Inject(BlockLiveTokenService) private readonly tokenVerifier: BlockLiveTokenVerifier,
    @Inject(BlockLiveAccessService) private readonly pageAccess: BlockLivePageAccess,
    @Inject(BlockLiveFanoutService) private readonly broadcaster: BlockLiveBroadcaster,
    @Inject(BLOCK_PRESENCE_STORE) private readonly presenceStore: BlockPresenceStore,
    @Inject(BlockLiveRequestService) private readonly requests: BlockLiveRequestAnswerer,
    @Inject(BLOCK_LIVE_SETTINGS) private readonly settings: BlockLiveSettings,
    @Inject(PinoLogger) private readonly logger: BlockLiveLogger,
  ) {}

  openConnection(socket: BlockLiveSocket): BlockLiveSocketHandler {
    const connection = this.registry.open(socket, Date.now());
    this.armDeadline(connection, this.settings.authTimeoutMs, BLOCK_LIVE_CLOSE_CODE.unauthorized, 'auth-timeout');
    connection.ageTimer = setTimeout(() => {
      this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.reconnectRequired, 'maximum-age');
    }, this.settings.maxConnectionAgeMs);
    return {
      handleClose: () => {
        void this.release(connection);
      },
      handleMessage: (text) => this.enqueue(connection, text),
    };
  }

  closeEveryConnection(): void {
    this.isStopped = true;
    for (const connection of this.registry.listConnections()) {
      this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.goingAway, 'shutting-down');
    }
  }

  private enqueue(connection: BlockLiveConnection, text: string): Promise<void> {
    connection.queue = this.processAfter(connection.queue, connection, text);
    return connection.queue;
  }

  /** One message at a time per socket, so a subscribe and the unsubscribe after it cannot overtake each other. */
  private async processAfter(previous: Promise<void>, connection: BlockLiveConnection, text: string): Promise<void> {
    await previous;
    await this.process(connection, text);
  }

  private async process(connection: BlockLiveConnection, text: string): Promise<void> {
    if (connection.isClosed) return;
    try {
      await this.dispatch(connection, text);
    } catch (error) {
      this.logger.error({ connectionId: connection.id, err: error }, 'live channel message failed');
      this.sendError(connection, BLOCK_LIVE_ERROR_CODE.internal);
    }
  }

  private async dispatch(connection: BlockLiveConnection, text: string): Promise<void> {
    if (!this.admit(connection)) return;
    const parsed = this.parseWithinSizeLimit(connection, text);
    if (parsed === null) return;
    if (parsed.isFail()) {
      this.rejectInvalidMessage(connection);
      return;
    }
    if (connection.reader === null) {
      await this.authenticate(connection, parsed.getValue());
      return;
    }
    this.armDeadline(connection, this.settings.idleTimeoutMs, BLOCK_LIVE_CLOSE_CODE.idle, 'idle');
    await this.handleAuthenticated(connection, connection.reader, parsed.getValue());
  }

  /**
   * Null once the socket was closed for sending too much. Only an authenticated socket may send a request larger
   * than the small limit, and a large message is parsed only for that.
   */
  private parseWithinSizeLimit(
    connection: BlockLiveConnection,
    text: string,
  ): Result<BlockLiveClientMessage, BlockLiveInvalidMessageError> | null {
    const byteLength = Buffer.byteLength(text, 'utf8');
    const isUnauthenticatedOversize = connection.reader === null && byteLength > BLOCK_LIVE_MAX_MESSAGE_BYTES;
    const parsed = isUnauthenticatedOversize ? null : parseClientMessage(text);
    if (parsed !== null && isMessageWithinSizeLimit(byteLength, parsed)) return parsed;
    this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.messageTooBig, 'message-too-big');
    return null;
  }

  private admit(connection: BlockLiveConnection): boolean {
    const registered = registerMessage(connection.messageWindow, Date.now(), BLOCK_LIVE_RATE_LIMIT);
    connection.messageWindow = registered.window;
    if (!registered.isAllowed) {
      this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.policyViolation, 'rate-limited');
    }
    return registered.isAllowed;
  }

  private rejectInvalidMessage(connection: BlockLiveConnection): void {
    if (connection.reader === null) {
      this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.unauthorized, 'unauthorized');
      return;
    }
    this.sendError(connection, BLOCK_LIVE_ERROR_CODE.invalidMessage);
  }

  private async authenticate(connection: BlockLiveConnection, message: BlockLiveClientMessage): Promise<void> {
    if (message.type !== 'auth') {
      this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.unauthorized, 'unauthorized');
      return;
    }
    const verified = await this.tokenVerifier.verify(message.token);
    if (connection.isClosed) return;
    if (verified.isFail()) {
      this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.unauthorized, 'unauthorized');
      return;
    }
    const reader = verified.getValue();
    if (this.registry.countAuthenticatedFor(reader.userId) >= BLOCK_LIVE_MAX_CONNECTIONS_PER_USER) {
      this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.tooManyConnections, 'too-many-connections');
      return;
    }
    connection.reader = reader;
    this.armDeadline(connection, this.settings.idleTimeoutMs, BLOCK_LIVE_CLOSE_CODE.idle, 'idle');
    this.send(connection, { type: 'ready' });
  }

  private async handleAuthenticated(
    connection: BlockLiveConnection,
    reader: BlockReader,
    message: BlockLiveClientMessage,
  ): Promise<void> {
    if (message.type === 'auth') {
      this.sendError(connection, BLOCK_LIVE_ERROR_CODE.alreadyAuthenticated);
      return;
    }
    if (message.type === 'ping') {
      this.send(connection, { type: 'pong' });
      return;
    }
    if (message.type === 'subscribe') {
      await this.subscribe(connection, reader, message.pageId);
      return;
    }
    if (message.type === 'unsubscribe') {
      await this.unsubscribe(connection, message.pageId);
      return;
    }
    if (message.type === 'transactions' || message.type === 'sync') {
      await this.answerRequest(connection, reader, message);
      return;
    }
    await this.reportPresence(connection, reader, message);
  }

  private async answerRequest(
    connection: BlockLiveConnection,
    reader: BlockReader,
    message: BlockLiveRequestMessage,
  ): Promise<void> {
    const answer = await this.requests.answer(reader, message);
    if (connection.isClosed) return;
    if (answer.kind === 'inactive') {
      this.closeConnection(connection, BLOCK_LIVE_CLOSE_CODE.unauthorized, 'account-unavailable');
      return;
    }
    this.send(connection, answer.message);
  }

  private async subscribe(connection: BlockLiveConnection, reader: BlockReader, pageId: string): Promise<void> {
    if (connection.subscriptions.has(pageId)) {
      this.send(connection, { pageId, type: 'subscribed' });
      return;
    }
    if (connection.subscriptions.size >= BLOCK_LIVE_MAX_SUBSCRIPTIONS_PER_CONNECTION) {
      this.sendError(connection, BLOCK_LIVE_ERROR_CODE.tooManySubscriptions, pageId);
      return;
    }
    const access = await this.pageAccess.resolvePageAccess(reader, pageId);
    if (connection.isClosed) return;
    if (access.isFail()) {
      this.sendError(connection, BLOCK_LIVE_ERROR_CODE.accessDenied, pageId);
      return;
    }
    connection.subscriptions.set(pageId, access.getValue().spaceId);
    this.send(connection, { pageId, type: 'subscribed' });
    await this.broadcaster.sendPresenceTo(connection.id, pageId);
  }

  private async unsubscribe(connection: BlockLiveConnection, pageId: string): Promise<void> {
    if (!connection.subscriptions.delete(pageId)) return;
    if (this.presenceStore.remove(pageId, connection.id)) await this.broadcaster.broadcastPresence(pageId);
  }

  private async reportPresence(
    connection: BlockLiveConnection,
    reader: BlockReader,
    { blockId, pageId }: BlockLivePresenceMessage,
  ): Promise<void> {
    if (!connection.subscriptions.has(pageId)) {
      this.sendError(connection, BLOCK_LIVE_ERROR_CODE.notSubscribed, pageId);
      return;
    }
    const canReadBlock = blockId === null || (await this.pageAccess.canReadBlockInPage(reader, pageId, blockId));
    if (connection.isClosed) return;
    if (!canReadBlock) {
      this.sendError(connection, BLOCK_LIVE_ERROR_CODE.accessDenied, pageId);
      return;
    }
    this.presenceStore.set({ blockId, connectionId: connection.id, pageId, userId: reader.userId }, Date.now());
    await this.broadcaster.broadcastPresence(pageId);
  }

  private armDeadline(connection: BlockLiveConnection, delayMs: number, code: number, reason: string): void {
    this.clearDeadline(connection);
    connection.deadlineTimer = setTimeout(() => {
      this.closeConnection(connection, code, reason);
    }, delayMs);
  }

  private clearDeadline(connection: BlockLiveConnection): void {
    if (connection.deadlineTimer !== null) clearTimeout(connection.deadlineTimer);
    connection.deadlineTimer = null;
  }

  private closeConnection(connection: BlockLiveConnection, code: number, reason: string): void {
    if (connection.isClosed) return;
    connection.socket.close(code, reason);
    void this.release(connection);
  }

  private async release(connection: BlockLiveConnection): Promise<void> {
    if (connection.isClosed) return;
    connection.isClosed = true;
    this.clearDeadline(connection);
    if (connection.ageTimer !== null) clearTimeout(connection.ageTimer);
    connection.ageTimer = null;
    this.registry.remove(connection);
    if (this.isStopped) return;
    try {
      const pageIds = this.presenceStore.removeConnection(connection.id);
      await Promise.all(pageIds.map((pageId) => this.broadcaster.broadcastPresence(pageId)));
    } catch (error) {
      this.logger.error({ connectionId: connection.id, err: error }, 'live channel presence cleanup failed');
    }
  }

  private send(connection: BlockLiveConnection, message: BlockLiveReplyMessage | LiveServerMessage): void {
    connection.socket.send(serializeServerMessage(message));
  }

  private sendError(connection: BlockLiveConnection, code: LiveErrorCode, pageId?: string): void {
    this.send(connection, pageId === undefined ? { code, type: 'error' } : { code, pageId, type: 'error' });
  }
}
