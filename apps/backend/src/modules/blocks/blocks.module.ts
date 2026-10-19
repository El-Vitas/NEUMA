import { Module } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { BlockLiveAccessService } from './block.live.access.service';
import { BlockLiveController } from './block.live.controller';
import { BlockLiveFanoutService } from './block.live.fanout.service';
import { BlockLiveGateway } from './block.live.gateway';
import { BlockLiveRequestService } from './block.live.request.service';
import { BlockLiveService } from './block.live.service';
import { BlockLiveTokenService } from './block.live.token.service';
import { BlockTransactionsController } from './block.transactions.controller';
import { BlockTransactionsService } from './block.transactions.service';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';
import {
  BLOCK_LIVE_DEFAULT_SETTINGS,
  BLOCK_LIVE_SETTINGS,
  BLOCK_PRESENCE_STORE,
} from './constants/block.live.constants';
import { BLOCK_TRANSACTION_REPOSITORY } from './constants/block.transaction.constants';
import { BLOCK_REPOSITORY } from './constants/blocks.constants';
import { BlockVersionListener } from './infrastructure/listener/block.version.listener';
import { BlockLiveRepository } from './infrastructure/persistence/block.live.repository';
import { BlockRepository } from './infrastructure/persistence/block.repository';
import { BlockTransactionRepository } from './infrastructure/persistence/block.transaction.repository';
import { InMemoryBlockPresenceStore } from './infrastructure/presence/block.presence.store';
import { BlockLiveRegistry } from './infrastructure/registry/block.live.registry';
import { BlockLiveWriteLimiter } from './infrastructure/throttling/block.live.write.limiter';
import type { BlockLiveSettings } from './types/block.live.types';

@Module({
  controllers: [BlocksController, BlockTransactionsController, BlockLiveController],
  providers: [
    BlockRepository,
    { provide: BLOCK_REPOSITORY, useExisting: BlockRepository },
    BlockTransactionRepository,
    { provide: BLOCK_TRANSACTION_REPOSITORY, useExisting: BlockTransactionRepository },
    BlocksService,
    BlockTransactionsService,
    WorkspaceContextService,
    { provide: BLOCK_LIVE_SETTINGS, useValue: BLOCK_LIVE_DEFAULT_SETTINGS },
    {
      inject: [BLOCK_LIVE_SETTINGS],
      provide: BLOCK_PRESENCE_STORE,
      useFactory: (settings: BlockLiveSettings): InMemoryBlockPresenceStore =>
        new InMemoryBlockPresenceStore(settings.presenceTimeToLiveMs),
    },
    BlockLiveRepository,
    BlockLiveRegistry,
    BlockVersionListener,
    BlockLiveTokenService,
    BlockLiveAccessService,
    BlockLiveFanoutService,
    BlockLiveWriteLimiter,
    BlockLiveRequestService,
    BlockLiveService,
    BlockLiveGateway,
  ],
})
export class BlocksModule {}
