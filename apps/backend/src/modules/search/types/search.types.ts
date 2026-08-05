import type { Prisma } from '@company-brain/db/generated';
import type { SearchPage, SearchQuery, SearchSourceType } from '../../../common/types/search.types';

export type { SearchPage, SearchQuery, SearchReader, SearchResult } from '../../../common/types/search.types';

export type SearchLanguage = 'en' | 'es';

export interface SearchDocumentInput {
  readonly contentType: string;
  readonly extractedText: string;
  readonly language: SearchLanguage | null;
  readonly properties: Prisma.InputJsonValue;
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly spaceId: string;
  readonly tags: Prisma.InputJsonValue;
  readonly title: string;
  readonly versionMarker: number;
}

export interface SearchQueryParams {
  readonly contentType?: string;
  readonly cursor?: string;
  readonly limit?: number | string;
  readonly query?: string;
  readonly sourceType?: SearchSourceType;
  readonly spaceId?: string;
  readonly tags?: string;
}

export interface SearchRow {
  readonly contentType: string;
  readonly rank: number;
  readonly snippet: string;
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly spaceId: string;
  readonly title: string;
  readonly updatedAt: Date;
}

export interface SearchCursor {
  readonly rank: number;
  readonly sourceId: string;
  readonly updatedAt: string;
}

export interface SearchRepositoryContract {
  readonly removeDocument: (input: SearchDocumentRemoval) => Promise<void>;
  readonly search: (query: SearchQuery) => Promise<SearchPage>;
  readonly upsertDocument: (input: SearchDocumentInput) => Promise<void>;
}

export interface SearchDocumentRemoval {
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly versionMarker: number;
}

export interface SearchDocumentProjection {
  readonly applyProjection: (input: SearchDocumentInput) => Promise<void>;
  readonly removeProjection: (input: SearchDocumentRemoval) => Promise<void>;
}

export interface SearchProjectionPage {
  readonly content: Prisma.JsonValue;
  readonly id: string;
  readonly lifecycle: string;
  readonly spaceId: string;
  readonly title: string;
  readonly version: number;
}

export interface SearchProjectionRecord {
  readonly databaseId: string;
  readonly id: string;
  readonly lifecycle: string;
  readonly propertyValues: Prisma.JsonValue;
  readonly title: string;
  readonly version: number;
  readonly database: {
    readonly lifecycle: string;
    readonly name: string;
    readonly properties: readonly {
      readonly key: string;
      readonly label: string;
      readonly type: string;
    }[];
    readonly spaceId: string;
    readonly template: string;
  };
}

export interface SearchProjectionSource {
  readonly findPage: (pageIdentifier: string) => Promise<SearchProjectionPage | null>;
  readonly findRecord: (recordId: string) => Promise<SearchProjectionRecord | null>;
  readonly listRecords: (databaseId: string) => Promise<readonly SearchProjectionRecord[]>;
}
