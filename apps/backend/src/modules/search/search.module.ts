import { Module } from '@nestjs/common';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { SEARCH_REPOSITORY } from './constants/search.tokens';
import { SearchRepository } from './infrastructure/persistence/search.repository';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  exports: [SearchService],
  providers: [
    SearchRepository,
    { provide: SEARCH_REPOSITORY, useExisting: SearchRepository },
    SearchService,
    WorkspaceContextService,
  ],
})
export class SearchModule {}
