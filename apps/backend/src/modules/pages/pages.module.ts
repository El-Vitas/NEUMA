import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { WorkspaceMemberRepository } from '../../common/infrastructure/persistence/workspace-member.repository';
import {
  PAGE_ATTACHMENTS_CLEANUP_REPOSITORY,
  PAGE_OUTLINE_REPOSITORY,
  PAGE_PURGE_REPOSITORY,
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
  PAGE_VERSION_RETENTION_REPOSITORY,
} from './constants/pages.constants';
import { PagePurgeRepository } from './infrastructure/persistence/page.purge.repository';
import { PageRepository } from './infrastructure/persistence/page.repository';
import { PageVersionRetentionRepository } from './infrastructure/persistence/page.version-retention.repository';
import { PageAttachmentsCleanupRepository } from './infrastructure/persistence/page-attachments.cleanup.repository';
import { PageOutlineRepository } from './infrastructure/persistence/page-outline.repository';
import { PageSchemaRepository } from './infrastructure/persistence/page-schema.repository';
import { PageRetentionScheduler } from './infrastructure/schedulers/page.retention.scheduler';
import { PageAssignedController } from './page.assigned.controller';
import { PageDestinationsController } from './page.destinations.controller';
import { PageLocationController } from './page.location.controller';
import { PageOutlineService } from './page.outline.service';
import { PageTrashController } from './page.trash.controller';
import { PageSchemaController } from './page-schema.controller';
import { PageSchemaService } from './page-schema.service';
import { PagesBatchController } from './pages.batch.controller';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [
    PagesController,
    PagesBatchController,
    PageSchemaController,
    PageTrashController,
    PageDestinationsController,
    PageLocationController,
    PageAssignedController,
  ],
  exports: [PagesService, PageSchemaService, PageOutlineService, PageRetentionScheduler],
  providers: [
    OutboxRepository,
    { provide: PAGE_ATTACHMENTS_CLEANUP_REPOSITORY, useClass: PageAttachmentsCleanupRepository },
    { provide: PAGE_OUTLINE_REPOSITORY, useClass: PageOutlineRepository },
    PageOutlineService,
    PagePurgeRepository,
    { provide: PAGE_PURGE_REPOSITORY, useExisting: PagePurgeRepository },
    PageVersionRetentionRepository,
    { provide: PAGE_VERSION_RETENTION_REPOSITORY, useExisting: PageVersionRetentionRepository },
    PageRetentionScheduler,
    { provide: PAGE_REPOSITORY, useClass: PageRepository },
    { provide: PAGE_SCHEMA_REPOSITORY, useClass: PageSchemaRepository },
    PagesService,
    PageSchemaService,
    WorkspaceContextService,
    WorkspaceMemberRepository,
  ],
})
export class PagesModule {}
