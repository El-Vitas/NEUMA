import { Module } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { WorkspaceMemberRepository } from '../../common/infrastructure/persistence/workspace-member.repository';
import { BlocksModule } from '../blocks/blocks.module';
import {
  PAGE_ATTACHMENTS_CLEANUP_REPOSITORY,
  PAGE_OUTLINE_REPOSITORY,
  PAGE_PURGE_REPOSITORY,
  PAGE_QUERY_CLOCK,
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
  PAGE_VERSION_CLOCK,
  PAGE_VERSION_RETENTION_REPOSITORY,
} from './constants/pages.constants';
import { systemPageQueryClock } from './infrastructure/adapters/page-query.clock';
import { PageBlockReader } from './infrastructure/persistence/page.block.reader';
import { PageBlockWriter } from './infrastructure/persistence/page.block.writer';
import { PagePurgeRepository } from './infrastructure/persistence/page.purge.repository';
import { PageRepository } from './infrastructure/persistence/page.repository';
import { PageSummaryReader } from './infrastructure/persistence/page.summary.reader';
import { PageTemplateRepository } from './infrastructure/persistence/page.template.repository';
import { PageVersionRepository } from './infrastructure/persistence/page.version.repository';
import { PageVersionRetentionRepository } from './infrastructure/persistence/page.version-retention.repository';
import { PageAttachmentsCleanupRepository } from './infrastructure/persistence/page-attachments.cleanup.repository';
import { PageChangesRepository } from './infrastructure/persistence/page-changes.repository';
import { PageComputedRepository } from './infrastructure/persistence/page-computed.repository';
import { PageOutlineRepository } from './infrastructure/persistence/page-outline.repository';
import { PageQueryRepository } from './infrastructure/persistence/page-query.repository';
import { PageSchemaRepository } from './infrastructure/persistence/page-schema.repository';
import { PageRetentionScheduler } from './infrastructure/schedulers/page.retention.scheduler';
import { systemPageVersionClock } from './infrastructure/schedulers/page.version.clock';
import { PageVersionScheduler } from './infrastructure/schedulers/page.version.scheduler';
import { PageAssignedController } from './page.assigned.controller';
import { PageCollectionsController } from './page.collections.controller';
import { PageDestinationsController } from './page.destinations.controller';
import { PageLocationController } from './page.location.controller';
import { PageOutlineService } from './page.outline.service';
import { PageTrashController } from './page.trash.controller';
import { PageVersionsController } from './page.versions.controller';
import { PageChangesService } from './page-changes.service';
import { PageComputedService } from './page-computed.service';
import { PageComputedPreviewService } from './page-computed-preview.service';
import { PageQueryController } from './page-query.controller';
import { PageQueryService } from './page-query.service';
import { PageRowComputedService } from './page-row-computed.service';
import { PageSchemaController } from './page-schema.controller';
import { PageSchemaService } from './page-schema.service';
import { PageTemplateController } from './page-template.controller';
import { PageTemplateService } from './page-template.service';
import { PageViewOperationsController } from './page-view-operations.controller';
import { PageViewOperationsService } from './page-view-operations.service';
import { PagesBatchController } from './pages.batch.controller';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [
    PagesController,
    PagesBatchController,
    PageSchemaController,
    PageQueryController,
    PageViewOperationsController,
    PageCollectionsController,
    PageTrashController,
    PageDestinationsController,
    PageLocationController,
    PageAssignedController,
    PageVersionsController,
    PageTemplateController,
  ],
  exports: [
    PagesService,
    PageTemplateService,
    PageSchemaService,
    PageQueryService,
    PageChangesService,
    PageComputedPreviewService,
    PageViewOperationsService,
    PageOutlineService,
    PageRetentionScheduler,
  ],
  imports: [BlocksModule],
  providers: [
    { provide: PAGE_ATTACHMENTS_CLEANUP_REPOSITORY, useClass: PageAttachmentsCleanupRepository },
    { provide: PAGE_OUTLINE_REPOSITORY, useClass: PageOutlineRepository },
    PageOutlineService,
    PageBlockReader,
    PageBlockWriter,
    PageSummaryReader,
    PageVersionRepository,
    PagePurgeRepository,
    { provide: PAGE_PURGE_REPOSITORY, useExisting: PagePurgeRepository },
    PageVersionRetentionRepository,
    { provide: PAGE_VERSION_RETENTION_REPOSITORY, useExisting: PageVersionRetentionRepository },
    PageRetentionScheduler,
    { provide: PAGE_VERSION_CLOCK, useValue: systemPageVersionClock },
    PageVersionScheduler,
    { provide: PAGE_REPOSITORY, useClass: PageRepository },
    { provide: PAGE_SCHEMA_REPOSITORY, useClass: PageSchemaRepository },
    PageQueryRepository,
    PageChangesRepository,
    PageComputedRepository,
    PageComputedService,
    PageComputedPreviewService,
    PageRowComputedService,
    PageTemplateRepository,
    PageTemplateService,
    { provide: PAGE_QUERY_CLOCK, useValue: systemPageQueryClock },
    PageQueryService,
    PageChangesService,
    PageViewOperationsService,
    PagesService,
    PageSchemaService,
    WorkspaceContextService,
    WorkspaceMemberRepository,
  ],
})
export class PagesModule {}
