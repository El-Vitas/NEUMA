import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../common/infrastructure/persistence/outbox.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { PAGE_REPOSITORY } from './constants/pages.constants';
import { PageRepository } from './infrastructure/persistence/page.repository';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [PagesController],
  exports: [PagesService],
  providers: [
    OutboxRepository,
    { provide: PAGE_REPOSITORY, useClass: PageRepository },
    PagesService,
    WorkspaceContextService,
  ],
})
export class PagesModule {}
