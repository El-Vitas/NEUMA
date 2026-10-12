import { Module } from '@nestjs/common';
import { OutboxConsumer } from '@neuma/db';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { LINKS_PROJECTION_OUTBOX, LINKS_PROJECTION_SOURCE, LINKS_REPOSITORY } from './constants/links.tokens';
import { PageLinkRepository } from './infrastructure/persistence/page-link.repository';
import { LinksProjectionSource } from './infrastructure/worker/links.projection.source';
import { LinksProjectionWorker } from './infrastructure/worker/links.projection.worker';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

@Module({
  controllers: [LinksController],
  exports: [LinksService, LinksProjectionWorker],
  providers: [
    PageLinkRepository,
    { provide: LINKS_REPOSITORY, useExisting: PageLinkRepository },
    LinksService,
    WorkspaceContextService,
    OutboxRepository,
    LinksProjectionWorker,
    LinksProjectionSource,
    {
      provide: LINKS_PROJECTION_OUTBOX,
      useFactory: (outbox: OutboxRepository) => outbox.forConsumer(OutboxConsumer.LINKS),
      inject: [OutboxRepository],
    },
    { provide: LINKS_PROJECTION_SOURCE, useExisting: LinksProjectionSource },
  ],
})
export class LinksModule {}
