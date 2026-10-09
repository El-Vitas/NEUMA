import type { Prisma } from '@company-brain/db/generated';
import type { PageIcon } from '@company-brain/shared';
import type {
  SearchQuery,
  SearchQueryFilters,
  SearchResult,
  SearchSourceType,
} from '../../../common/types/search.types';
import type { PageBlocksProjection, PageBlocksRemoval } from './page-block.types';

export type {
  SearchEditedRange,
  SearchPage,
  SearchQuery,
  SearchQueryFilters,
  SearchReader,
  SearchResult,
} from '../../../common/types/search.types';

export type SearchLanguage = 'en' | 'es';

export type SearchQueryWithFilters = SearchQuery & SearchQueryFilters;

export interface SearchDocumentInput {
  readonly contentType: string;
  /** Cuándo se editó lo indexado, no cuándo se indexó: volver a indexar no lo vuelve reciente. */
  readonly editedAt: Date;
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
  readonly authorQuery?: string;
  readonly contentType?: string;
  readonly cursor?: string;
  readonly editedRange?: string;
  readonly limit?: number | string;
  readonly query?: string;
  readonly sourceType?: SearchSourceType;
  readonly spaceId?: string;
  readonly tags?: string;
  readonly verifiedOnly?: boolean;
}

export interface SearchRow {
  readonly contentType: string;
  readonly icon: Prisma.JsonValue;
  readonly isVerified: boolean;
  readonly parentPageId: string | null;
  readonly parentPageTitle: string | null;
  readonly rank: number;
  readonly snippet: string;
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly spaceId: string;
  readonly spaceName: string | null;
  readonly title: string;
  readonly updatedAt: Date;
}

export interface SearchResultContext {
  readonly icon: PageIcon | null;
  readonly parentPageId: string | null;
  readonly parentPageTitle: string | null;
  readonly spaceName: string | null;
}

export type SearchResultWithContext = SearchResult & SearchResultContext;

export interface SearchPageWithContext {
  readonly items: readonly SearchResultWithContext[];
  readonly nextCursor?: string;
}

export interface SearchCursor {
  readonly rank: number;
  readonly sourceId: string;
  readonly updatedAt: string;
}

export interface SearchRepositoryContract {
  readonly removeDocument: (input: SearchDocumentRemoval) => Promise<void>;
  readonly search: (query: SearchQueryWithFilters) => Promise<SearchPageWithContext>;
  readonly upsertDocument: (input: SearchDocumentInput) => Promise<void>;
}

export interface SearchDocumentRemoval {
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly versionMarker: number;
}

export interface SearchDocumentProjection {
  readonly applyBlocksProjection: (input: PageBlocksProjection) => Promise<void>;
  readonly applyProjection: (input: SearchDocumentInput) => Promise<void>;
  readonly removeBlocksProjection: (input: PageBlocksRemoval) => Promise<void>;
  readonly removeProjection: (input: SearchDocumentRemoval) => Promise<void>;
}

export interface SearchProjectionPage {
  readonly authorId: string;
  readonly authorName: string | null;
  readonly content: Prisma.JsonValue;
  readonly icon: Prisma.JsonValue;
  readonly id: string;
  readonly lifecycle: string;
  readonly parentPageId: string | null;
  readonly parentPageTitle: string | null;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly title: string;
  /** Cuándo se editó la página por última vez: la fecha que el índice da por suya. */
  readonly updatedAt: Date;
  readonly verificationExpiresAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly version: number;
}

export interface SearchProjectionSource {
  readonly findPage: (pageIdentifier: string) => Promise<SearchProjectionPage | null>;
}
