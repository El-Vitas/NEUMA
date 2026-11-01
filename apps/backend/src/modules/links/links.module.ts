import { Module } from '@nestjs/common';
import { BlockAccessRepository } from '../../common/infrastructure/persistence/block-access.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { LINKS_REPOSITORY } from './constants/links.tokens';
import { BlockLinkRepository } from './infrastructure/persistence/block-link.repository';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

@Module({
  controllers: [LinksController],
  exports: [LinksService],
  providers: [
    BlockAccessRepository,
    BlockLinkRepository,
    { provide: LINKS_REPOSITORY, useExisting: BlockLinkRepository },
    LinksService,
    WorkspaceContextService,
  ],
})
export class LinksModule {}
