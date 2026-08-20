import type { z } from 'zod';
import type { PageIcon } from '@/modules/pages/types/pages.icon.types';
import type { SEARCH_SOURCE_TYPES } from '../constants/search.constants';
import type { searchQuerySchema } from '../schemas/search.schemas';

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export type SearchSourceType = (typeof SEARCH_SOURCE_TYPES)[number];

export interface SearchSnippetPart {
  readonly highlighted: boolean;
  readonly text: string;
}

export interface SearchResult {
  readonly contentType: string;
  readonly icon?: PageIcon | null;
  readonly parentPageId?: string | null;
  readonly parentPageTitle?: string | null;
  readonly rank: number;
  readonly snippet: readonly SearchSnippetPart[];
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly spaceId: string;
  readonly spaceName?: string | null;
  readonly title: string;
  readonly updatedAt: string;
}

export interface SearchPage {
  readonly items: readonly SearchResult[];
  readonly nextCursor?: string;
}
