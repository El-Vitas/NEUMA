import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { WorkspaceMemberRepository } from '../../common/infrastructure/persistence/workspace-member.repository';
import {
  PAGE_ATTACHMENTS_CLEANUP_REPOSITORY,
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
} from './constants/pages.constants';
import { PageRepository } from './infrastructure/persistence/page.repository';
import { PageAttachmentsCleanupRepository } from './infrastructure/persistence/page-attachments.cleanup.repository';
import { PageSchemaRepository } from './infrastructure/persistence/page-schema.repository';
import { PageTrashController } from './page.trash.controller';
import { PageSchemaController } from './page-schema.controller';
import { PageSchemaService } from './page-schema.service';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [PagesController, PageSchemaController, PageTrashController],
  exports: [PagesService, PageSchemaService],
  providers: [
    OutboxRepository,
    { provide: PAGE_ATTACHMENTS_CLEANUP_REPOSITORY, useClass: PageAttachmentsCleanupRepository },
    { provide: PAGE_REPOSITORY, useClass: PageRepository },
    { provide: PAGE_SCHEMA_REPOSITORY, useClass: PageSchemaRepository },
    PagesService,
    PageSchemaService,
    WorkspaceContextService,
    WorkspaceMemberRepository,
  ],
})
export class PagesModule {}
