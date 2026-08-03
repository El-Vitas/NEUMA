import { Inject, Injectable } from '@nestjs/common';
import { SEARCH_REPOSITORY } from './constants/search.tokens';
import type {
  SearchDocumentInput,
  SearchDocumentRemoval,
  SearchPage,
  SearchQuery,
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

  async search(query: SearchQuery): Promise<SearchPage> {
    if (query.query.trim() === '') return { items: [] };
    return this.searchRepository.search(query);
  }
}
