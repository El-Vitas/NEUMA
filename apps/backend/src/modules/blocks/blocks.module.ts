import { Module } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { BlockTransactionsController } from './block.transactions.controller';
import { BlockTransactionsService } from './block.transactions.service';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';
import { BLOCK_TRANSACTION_REPOSITORY } from './constants/block.transaction.constants';
import { BLOCK_REPOSITORY } from './constants/blocks.constants';
import { BlockRepository } from './infrastructure/persistence/block.repository';
import { BlockTransactionRepository } from './infrastructure/persistence/block.transaction.repository';

@Module({
  controllers: [BlocksController, BlockTransactionsController],
  providers: [
    BlockRepository,
    { provide: BLOCK_REPOSITORY, useExisting: BlockRepository },
    BlockTransactionRepository,
    { provide: BLOCK_TRANSACTION_REPOSITORY, useExisting: BlockTransactionRepository },
    BlocksService,
    BlockTransactionsService,
    WorkspaceContextService,
  ],
})
export class BlocksModule {}
