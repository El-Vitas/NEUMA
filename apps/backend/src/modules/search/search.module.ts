import { Module } from '@nestjs/common';
import { SearchRepository } from './infrastructure/persistence/search.repository';
import { SearchService } from './search.service';

@Module({
  exports: [SearchService],
  providers: [SearchRepository, SearchService],
})
export class SearchModule {}
