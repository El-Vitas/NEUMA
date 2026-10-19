import { Module } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';
import { BLOCK_REPOSITORY } from './constants/blocks.constants';
import { BlockRepository } from './infrastructure/persistence/block.repository';

@Module({
  controllers: [BlocksController],
  providers: [
    BlockRepository,
    { provide: BLOCK_REPOSITORY, useExisting: BlockRepository },
    BlocksService,
    WorkspaceContextService,
  ],
})
export class BlocksModule {}
