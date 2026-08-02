import { SearchIndexingState } from '@company-brain/db';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { SearchDocumentInput, SearchResult } from '../../types/search.types';

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertDocument(input: SearchDocumentInput): Promise<void> {
    await this.prisma.searchDocument.upsert({
      create: { ...input, indexingState: SearchIndexingState.INDEXED },
      update: { ...input, indexingState: SearchIndexingState.INDEXED },
      where: { pageId: input.pageId },
    });
  }

  search(_query: {
    readonly limit: number;
    readonly query: string;
    readonly spaceId?: string;
  }): Promise<readonly SearchResult[]> {
    return Promise.resolve<readonly SearchResult[]>([]);
  }
}
