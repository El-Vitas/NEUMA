import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { COMMENT_EVENTS_CHANNEL } from '../../../../common/constants/comment-events.constants';
import { DATABASE_URL_KEY } from '../../../../common/constants/env.constants';
import {
  BLOCK_LISTEN_CLIENT_FACTORY,
  BLOCK_LIVE_APPLICATION_NAME,
  BLOCK_LIVE_APPLICATION_NAME_SETTING,
  BLOCK_LIVE_HEARTBEAT_CHANNEL,
  BLOCK_LIVE_SETTINGS,
} from '../../constants/block.live.constants';
import { BLOCK_NOTIFY_CHANNEL } from '../../constants/block.transaction.constants';
import type {
  BlockListenClient,
  BlockListenClientFactory,
  BlockLiveLogger,
  BlockLiveSettings,
  BlockVersionListenerHandlers,
} from '../../types/block.live.types';

/**
 * The one `LISTEN` connection of the process. It lives outside the Prisma pool, because a pooled connection is
 * handed to other work and a listener must keep its session. When it drops it reconnects with a growing pause, and
 * once it is back it says so, because the notifications sent in between are gone.
 *
 * A connection can also die without saying anything: a socket dropped by a network device never raises `error` or
 * `end`. So the connection sends itself a message on an interval and takes itself for dead when it does not come back.
 */
@Injectable()
export class BlockVersionListener {
  private awaitedHeartbeat: string | null = null;
  private client: BlockListenClient | null = null;
  private failedAttempts = 0;
  private handlers: BlockVersionListenerHandlers | null = null;
  private heartbeatDeadline: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isRecovering = false;
  private isStopped = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(PinoLogger) private readonly logger: BlockLiveLogger,
    @Inject(BLOCK_LIVE_SETTINGS) private readonly settings: BlockLiveSettings,
    @Inject(BLOCK_LISTEN_CLIENT_FACTORY) private readonly createClient: BlockListenClientFactory,
  ) {}

  /** Resolves after the first attempt. A failed first attempt is retried in the background. */
  async start(handlers: BlockVersionListenerHandlers): Promise<void> {
    this.handlers = handlers;
    this.isStopped = false;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.isStopped = true;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const client = this.client;
    this.client = null;
    if (client !== null) await this.endConnection(client);
  }

  private async connect(): Promise<void> {
    const client = this.createClient(
      this.configService.getOrThrow<string>(DATABASE_URL_KEY),
      this.settings.keepAliveInitialDelayMs,
    );
    this.client = client;
    client.onNotification((message) => {
      this.routeNotification(message);
    });
    client.onError((error) => {
      void this.handleLost(client, error);
    });
    client.onEnd(() => {
      void this.handleLost(client, null);
    });
    try {
      await client.connect();
      await client.query('SELECT set_config($1, $2, false)', [
        BLOCK_LIVE_APPLICATION_NAME_SETTING,
        BLOCK_LIVE_APPLICATION_NAME,
      ]);
      await client.query(`LISTEN ${BLOCK_NOTIFY_CHANNEL}`);
      await client.query(`LISTEN ${COMMENT_EVENTS_CHANNEL}`);
      await client.query(`LISTEN ${BLOCK_LIVE_HEARTBEAT_CHANNEL}`);
    } catch (error) {
      await this.handleLost(client, error);
      return;
    }
    if (this.client !== client) {
      await this.endConnection(client);
      return;
    }
    this.markConnected();
    this.startHeartbeat(client);
  }

  private routeNotification(message: { readonly channel: string; readonly payload?: string }): void {
    if (message.payload === undefined) return;
    if (message.channel === BLOCK_NOTIFY_CHANNEL) this.handlers?.onNotification(message.payload);
    if (message.channel === COMMENT_EVENTS_CHANNEL) this.handlers?.onCommentEvent(message.payload);
    if (message.channel === BLOCK_LIVE_HEARTBEAT_CHANNEL) this.acknowledgeHeartbeat(message.payload);
  }

  private markConnected(): void {
    this.failedAttempts = 0;
    if (!this.isRecovering) return;
    this.isRecovering = false;
    this.handlers?.onRecovered();
  }

  private startHeartbeat(client: BlockListenClient): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(client);
    }, this.settings.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) clearInterval(this.heartbeatTimer);
    if (this.heartbeatDeadline !== null) clearTimeout(this.heartbeatDeadline);
    this.heartbeatTimer = null;
    this.heartbeatDeadline = null;
    this.awaitedHeartbeat = null;
  }

  /** A message to itself: it travels out through the connection and comes back only if the connection still hears. */
  private sendHeartbeat(client: BlockListenClient): void {
    if (this.awaitedHeartbeat !== null) return;
    const token = randomUUID();
    this.awaitedHeartbeat = token;
    this.heartbeatDeadline = setTimeout(() => {
      void this.handleLost(client, new Error('The listen connection did not hear its own heartbeat'));
    }, this.settings.heartbeatTimeoutMs);
    client.query('SELECT pg_notify($1, $2)', [BLOCK_LIVE_HEARTBEAT_CHANNEL, token]).catch((error: unknown) => {
      void this.handleLost(client, error);
    });
  }

  private acknowledgeHeartbeat(token: string): void {
    if (token !== this.awaitedHeartbeat) return;
    this.awaitedHeartbeat = null;
    if (this.heartbeatDeadline !== null) clearTimeout(this.heartbeatDeadline);
    this.heartbeatDeadline = null;
  }

  /** Both `error` and `end` fire for one loss, and a stopped listener expects its own end: only the first counts. */
  private async handleLost(client: BlockListenClient, error: unknown): Promise<void> {
    if (this.client !== client) return;
    this.client = null;
    this.isRecovering = true;
    this.stopHeartbeat();
    if (error !== null) this.logger.error({ err: error }, 'live channel lost its listen connection');
    await this.endConnection(client);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.isStopped || this.reconnectTimer !== null) return;
    const delay = Math.min(
      this.settings.reconnectInitialDelayMs * 2 ** this.failedAttempts,
      this.settings.reconnectMaxDelayMs,
    );
    this.failedAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private async endConnection(client: BlockListenClient): Promise<void> {
    try {
      await client.end();
    } catch (error) {
      this.logger.error({ err: error }, 'live channel could not close a listen connection');
    }
  }
}
