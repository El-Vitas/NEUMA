import { Injectable } from '@nestjs/common';
import { SearchRepository } from './infrastructure/persistence/search.repository';
import type { SearchDocumentInput, SearchQuery, SearchReader, SearchResult } from './types/search.types';

@Injectable()
export class SearchService implements SearchReader {
  constructor(private readonly searchRepository: SearchRepository) {}

  async applyProjection(input: SearchDocumentInput): Promise<void> {
    await this.searchRepository.upsertDocument(input);
  }

  async search(query: SearchQuery): Promise<readonly SearchResult[]> {
    return this.searchRepository.search(query);
  }
}
