import type { JsonValue } from '@neuma/db';
import type { PageIcon } from '@neuma/shared';
import type {
  PageBlockSearchQuery,
  SearchQuery,
  SearchQueryFilters,
  SearchResult,
  SearchTokenScope,
} from '../../../common/types/search.types';
import type { SearchCandidate, SearchGranularity } from '../domain/search.domain.types';

export type {
  PageBlockSearchPage,
  PageBlockSearchQuery,
  PageBlockSearchReader,
  PageBlockSearchResult,
  SearchEditedRange,
  SearchPage,
  SearchQuery,
  SearchQueryFilters,
  SearchReader,
  SearchResult,
} from '../../../common/types/search.types';
export type {
  DeclaringAncestor,
  HeadingEntry,
  ReadableSlice,
  SearchCandidate,
  SearchGranularity,
} from '../domain/search.domain.types';

export type SearchQueryWithFilters = SearchQuery & SearchQueryFilters;

/** `words` is the normal match; `typo` is the fallback when nothing matched, so it is never mixed into a page. */
export type SearchMatching = 'words' | 'typo';

export interface SearchQueryParams {
  readonly authorQuery?: string;
  readonly contentType?: string;
  readonly cursor?: string;
  readonly editedRange?: string;
  readonly limit?: number | string;
  readonly query?: string;
  readonly sourceType?: SearchResult['sourceType'];
  readonly spaceId?: string;
  readonly verifiedOnly?: boolean;
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

export interface SearchCursorPosition {
  readonly id: string;
  readonly rank: number;
}

export interface SearchCursor extends SearchCursorPosition {
  readonly matching: SearchMatching;
}

/** What both kinds of search ask of the blocks. */
export interface SearchCandidateQuery extends SearchQueryFilters {
  readonly blockType?: string;
  readonly excludedBranchPageId?: string;
  readonly query: string;
  /** Restricts the search to blocks under this page. */
  readonly rootPageId?: string;
  readonly spaceId?: string;
  readonly tokenScope?: SearchTokenScope;
  readonly userId: string;
  readonly userRole: PageBlockSearchQuery['userRole'];
  readonly workspaceId: string;
}

export interface SearchCandidateRequest {
  readonly cursor: SearchCursorPosition | null;
  readonly fetchSize: number;
  readonly granularity: SearchGranularity;
  readonly matching: SearchMatching;
  readonly query: SearchCandidateQuery;
  /** Best matches whose ancestors are walked; the repository picks it when absent. */
  readonly windowSize?: number;
}

/** A statement row, before the JSON columns are checked. */
export type SearchCandidateRow = Omit<SearchCandidate, 'chain' | 'headings' | 'pageChain'> & {
  readonly chain: JsonValue;
  readonly pageChain: JsonValue;
  readonly headings: JsonValue;
};

export interface CollectRequest {
  readonly cursor: string | undefined;
  readonly granularity: SearchGranularity;
  readonly limit: number;
  readonly query: SearchCandidateQuery;
}

export interface CollectedPage {
  readonly items: readonly SearchCandidate[];
  readonly nextCursor: string | undefined;
}

export interface SearchRepositoryContract {
  readonly findCandidates: (request: SearchCandidateRequest) => Promise<readonly SearchCandidate[]>;
  readonly locateBlock: (blockId: string, workspaceId: string) => Promise<readonly string[]>;
}
