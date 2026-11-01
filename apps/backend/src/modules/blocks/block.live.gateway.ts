import { type BeforeApplicationShutdown, Inject, Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { FastifyAdapter } from '@nestjs/platform-fastify';
import { BlockLiveFanoutService } from './block.live.fanout.service';
import { BlockLiveService } from './block.live.service';
import { BLOCK_LIVE_SETTINGS } from './constants/block.live.constants';
import { BlockVersionListener } from './infrastructure/listener/block.version.listener';
import { registerBlockLiveTransport } from './infrastructure/transport/block.live.transport';
import type { BlockLiveSettings } from './types/block.live.types';

/**
 * Mounts the socket and the listener when `main.ts` starts the server, and takes them down before the database
 * closes. It is not a module init hook: a command that boots the modules without a server has no HTTP adapter.
 */
@Injectable()
export class BlockLiveGateway implements BeforeApplicationShutdown {
  private presenceSweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost<FastifyAdapter>,
    private readonly blockLiveService: BlockLiveService,
    private readonly fanoutService: BlockLiveFanoutService,
    private readonly versionListener: BlockVersionListener,
    @Inject(BLOCK_LIVE_SETTINGS) private readonly settings: BlockLiveSettings,
  ) {}

  async start(): Promise<void> {
    await registerBlockLiveTransport(this.httpAdapterHost.httpAdapter.getInstance(), (socket) =>
      this.blockLiveService.openConnection(socket),
    );
    await this.versionListener.start({
      onCommentEvent: (payload) => {
        this.fanoutService.enqueueCommentEvent(payload);
      },
      onNotification: (payload) => {
        this.fanoutService.enqueueNotification(payload);
      },
      onRecovered: () => {
        this.fanoutService.resyncEverySubscription();
      },
    });
    this.presenceSweepTimer = setInterval(() => {
      void this.fanoutService.expirePresence();
    }, this.settings.presenceSweepIntervalMs);
  }

  /** Runs before the database pool closes: the listener stops first, then the sockets, then what is in flight ends. */
  async beforeApplicationShutdown(): Promise<void> {
    if (this.presenceSweepTimer !== null) clearInterval(this.presenceSweepTimer);
    this.presenceSweepTimer = null;
    await this.versionListener.stop();
    this.blockLiveService.closeEveryConnection();
    await this.fanoutService.drain();
  }
}
