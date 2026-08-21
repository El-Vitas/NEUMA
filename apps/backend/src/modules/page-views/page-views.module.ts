import { Module } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { PAGE_VIEW_REPOSITORY } from './constants/page-views.constants';
import { PageViewRepository } from './infrastructure/persistence/page-view.repository';
import { PageViewsController } from './page-views.controller';
import { PageViewsService } from './page-views.service';

@Module({
  controllers: [PageViewsController],
  providers: [
    PageViewRepository,
    { provide: PAGE_VIEW_REPOSITORY, useExisting: PageViewRepository },
    PageViewsService,
    WorkspaceContextService,
  ],
})
export class PageViewsModule {}
