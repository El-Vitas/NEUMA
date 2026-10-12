import { Module } from '@nestjs/common';
import { OutboxConsumer } from '@neuma/db';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import {
  PAGE_BLOCK_REPOSITORY,
  SEARCH_PROJECTION_OUTBOX,
  SEARCH_PROJECTION_SOURCE,
  SEARCH_REPOSITORY,
} from './constants/search.tokens';
import { PageBlockRepository } from './infrastructure/persistence/page-block.repository';
import { SearchRepository } from './infrastructure/persistence/search.repository';
import { SearchProjectionSource } from './infrastructure/worker/search.projection.source';
import { SearchProjectionWorker } from './infrastructure/worker/search.projection.worker';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  exports: [SearchService, SearchProjectionWorker],
  providers: [
    SearchRepository,
    { provide: SEARCH_REPOSITORY, useExisting: SearchRepository },
    PageBlockRepository,
    { provide: PAGE_BLOCK_REPOSITORY, useExisting: PageBlockRepository },
    SearchService,
    WorkspaceContextService,
    OutboxRepository,
    SearchProjectionWorker,
    SearchProjectionSource,
    {
      provide: SEARCH_PROJECTION_OUTBOX,
      useFactory: (outbox: OutboxRepository) => outbox.forConsumer(OutboxConsumer.SEARCH),
      inject: [OutboxRepository],
    },
    { provide: SEARCH_PROJECTION_SOURCE, useExisting: SearchProjectionSource },
  ],
})
export class SearchModule {}
