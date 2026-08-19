import { Inject, Injectable } from '@nestjs/common';
import { SEARCH_REPOSITORY } from './constants/search.tokens';
import type {
  SearchDocumentInput,
  SearchDocumentRemoval,
  SearchPageWithContext,
  SearchQueryWithFilters,
  SearchReader,
  SearchRepositoryContract,
} from './types/search.types';

@Injectable()
export class SearchService implements SearchReader {
  constructor(@Inject(SEARCH_REPOSITORY) private readonly searchRepository: SearchRepositoryContract) {}

  async applyProjection(input: SearchDocumentInput): Promise<void> {
    await this.searchRepository.upsertDocument(input);
  }

  async removeProjection(input: SearchDocumentRemoval): Promise<void> {
    await this.searchRepository.removeDocument(input);
  }

  async search(query: SearchQueryWithFilters): Promise<SearchPageWithContext> {
    if (query.query.trim() === '') return { items: [] };
    return this.searchRepository.search(query);
  }
}
