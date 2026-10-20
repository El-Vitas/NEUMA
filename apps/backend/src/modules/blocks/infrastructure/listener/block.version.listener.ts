import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { Client } from 'pg';
import { COMMENT_EVENTS_CHANNEL } from '../../../../common/constants/comment-events.constants';
import { DATABASE_URL_KEY } from '../../../../common/constants/env.constants';
import {
  BLOCK_LIVE_APPLICATION_NAME,
  BLOCK_LIVE_APPLICATION_NAME_SETTING,
  BLOCK_LIVE_SETTINGS,
} from '../../constants/block.live.constants';
import { BLOCK_NOTIFY_CHANNEL } from '../../constants/block.transaction.constants';
import type { BlockLiveLogger, BlockLiveSettings, BlockVersionListenerHandlers } from '../../types/block.live.types';

/**
 * The one `LISTEN` connection of the process. It lives outside the Prisma pool, because a pooled connection is
 * handed to other work and a listener must keep its session. When it drops it reconnects with a growing pause, and
 * once it is back it says so, because the notifications sent in between are gone.
 */
@Injectable()
export class BlockVersionListener {
  private client: Client | null = null;
  private failedAttempts = 0;
  private handlers: BlockVersionListenerHandlers | null = null;
  private isRecovering = false;
  private isStopped = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(PinoLogger) private readonly logger: BlockLiveLogger,
    @Inject(BLOCK_LIVE_SETTINGS) private readonly settings: BlockLiveSettings,
  ) {}

  /** Resolves after the first attempt. A failed first attempt is retried in the background. */
  async start(handlers: BlockVersionListenerHandlers): Promise<void> {
    this.handlers = handlers;
    this.isStopped = false;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.isStopped = true;
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const client = this.client;
    this.client = null;
    if (client !== null) await this.endConnection(client);
  }

  private async connect(): Promise<void> {
    const client = new Client({
      connectionString: this.configService.getOrThrow<string>(DATABASE_URL_KEY),
      keepAlive: true,
    });
    this.client = client;
    client.on('notification', (message) => {
      if (message.payload === undefined) return;
      if (message.channel === BLOCK_NOTIFY_CHANNEL) this.handlers?.onNotification(message.payload);
      if (message.channel === COMMENT_EVENTS_CHANNEL) this.handlers?.onCommentEvent(message.payload);
    });
    client.on('error', (error) => {
      void this.handleLost(client, error);
    });
    client.on('end', () => {
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
    } catch (error) {
      await this.handleLost(client, error);
      return;
    }
    if (this.client !== client) {
      await this.endConnection(client);
      return;
    }
    this.markConnected();
  }

  private markConnected(): void {
    this.failedAttempts = 0;
    if (!this.isRecovering) return;
    this.isRecovering = false;
    this.handlers?.onRecovered();
  }

  /** Both `error` and `end` fire for one loss, and a stopped listener expects its own end: only the first counts. */
  private async handleLost(client: Client, error: unknown): Promise<void> {
    if (this.client !== client) return;
    this.client = null;
    this.isRecovering = true;
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

  private async endConnection(client: Client): Promise<void> {
    try {
      await client.end();
    } catch (error) {
      this.logger.error({ err: error }, 'live channel could not close a listen connection');
    }
  }
}
