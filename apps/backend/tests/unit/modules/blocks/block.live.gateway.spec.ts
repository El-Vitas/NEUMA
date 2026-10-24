import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { BlockLiveFanoutService } from '@/modules/blocks/block.live.fanout.service';
import { BlockLiveGateway } from '@/modules/blocks/block.live.gateway';
import { BlockLiveService } from '@/modules/blocks/block.live.service';
import { BLOCK_LIVE_DEFAULT_SETTINGS, BLOCK_LIVE_SETTINGS } from '@/modules/blocks/constants/block.live.constants';
import { BlockVersionListener } from '@/modules/blocks/infrastructure/listener/block.version.listener';

describe('BlockLiveGateway', () => {
  it('lets an application context without an HTTP server, such as the admin:create command, start and close', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BlockLiveGateway,
        { provide: HttpAdapterHost, useValue: new HttpAdapterHost() },
        { provide: BlockLiveService, useValue: { closeEveryConnection: () => undefined } },
        { provide: BlockLiveFanoutService, useValue: { drain: () => Promise.resolve() } },
        { provide: BlockVersionListener, useValue: { stop: () => Promise.resolve() } },
        { provide: BLOCK_LIVE_SETTINGS, useValue: BLOCK_LIVE_DEFAULT_SETTINGS },
      ],
    }).compile();

    const initialized = await moduleRef.init();
    await moduleRef.close();

    expect(initialized).toBe(moduleRef);
  });
});
