import type { UserRole } from '@company-brain/shared';
import { SEARCH_SOURCE_TYPE_VALUES } from '../constants/search.constants';

export type SearchSourceType = (typeof SEARCH_SOURCE_TYPE_VALUES)[number];

export interface SearchQuery {
  readonly contentType?: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly query: string;
  readonly sourceType?: SearchSourceType;
  readonly spaceId?: string;
  readonly tags?: readonly string[];
  /**
   * Los únicos espacios donde buscar, además de lo que la persona ve. Lo usa
   * un token que solo tiene dados algunos espacios; vacío no encuentra nada.
   */
  readonly withinSpaceIds?: readonly string[];
  readonly userId: string;
  readonly userRole: UserRole;
  readonly workspaceId: string;
}

export interface SearchResult {
  readonly contentType: string;
  readonly rank: number;
  readonly spaceId: string;
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly snippet: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface SearchPage {
  readonly items: readonly SearchResult[];
  readonly nextCursor?: string;
}

export interface SearchReader {
  readonly search: (query: SearchQuery) => Promise<SearchPage>;
}
