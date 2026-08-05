import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { WorkspaceMemberRepository } from '../../common/infrastructure/persistence/workspace-member.repository';
import { PAGE_REPOSITORY, PAGE_SCHEMA_REPOSITORY } from './constants/pages.constants';
import { PageRepository } from './infrastructure/persistence/page.repository';
import { PageSchemaRepository } from './infrastructure/persistence/page-schema.repository';
import { PageSchemaController } from './page-schema.controller';
import { PageSchemaService } from './page-schema.service';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [PagesController, PageSchemaController],
  exports: [PagesService, PageSchemaService],
  providers: [
    OutboxRepository,
    { provide: PAGE_REPOSITORY, useClass: PageRepository },
    { provide: PAGE_SCHEMA_REPOSITORY, useClass: PageSchemaRepository },
    PagesService,
    PageSchemaService,
    WorkspaceContextService,
    WorkspaceMemberRepository,
  ],
})
export class PagesModule {}
