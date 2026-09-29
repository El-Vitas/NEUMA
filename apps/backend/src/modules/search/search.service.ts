import { Inject, Injectable } from '@nestjs/common';
import { PAGE_BLOCK_REPOSITORY, SEARCH_REPOSITORY } from './constants/search.tokens';
import type {
  PageBlockRepositoryContract,
  PageBlockSearchPage,
  PageBlockSearchQuery,
  PageBlockSearchReader,
  PageBlocksProjection,
  PageBlocksRemoval,
} from './types/page-block.types';
import type {
  SearchDocumentInput,
  SearchDocumentProjection,
  SearchDocumentRemoval,
  SearchPageWithContext,
  SearchQueryWithFilters,
  SearchReader,
  SearchRepositoryContract,
} from './types/search.types';

@Injectable()
export class SearchService implements SearchReader, PageBlockSearchReader, SearchDocumentProjection {
  constructor(
    @Inject(SEARCH_REPOSITORY) private readonly searchRepository: SearchRepositoryContract,
    @Inject(PAGE_BLOCK_REPOSITORY) private readonly pageBlockRepository: PageBlockRepositoryContract,
  ) {}

  async applyProjection(input: SearchDocumentInput): Promise<void> {
    await this.searchRepository.upsertDocument(input);
  }

  async removeProjection(input: SearchDocumentRemoval): Promise<void> {
    await this.searchRepository.removeDocument(input);
  }

  async applyBlocksProjection(input: PageBlocksProjection): Promise<void> {
    await this.pageBlockRepository.replaceBlocks(input);
  }

  async removeBlocksProjection(input: PageBlocksRemoval): Promise<void> {
    await this.pageBlockRepository.removeBlocks(input);
  }

  async search(query: SearchQueryWithFilters): Promise<SearchPageWithContext> {
    if (query.query.trim() === '') return { items: [] };
    return this.searchRepository.search(query);
  }

  locateBlock(blockId: string, workspaceId: string): Promise<readonly string[]> {
    return this.pageBlockRepository.locateBlock(blockId, workspaceId);
  }

  async searchBlocks(query: PageBlockSearchQuery): Promise<PageBlockSearchPage> {
    if (query.query.trim() === '') return { items: [] };
    return this.pageBlockRepository.searchBlocks(query);
  }
}
