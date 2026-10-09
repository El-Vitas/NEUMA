import type { UserRole } from '@company-brain/shared';
import type { SEARCH_EDITED_RANGE_VALUES, SEARCH_SOURCE_TYPE_VALUES } from '../constants/search.constants';

export type SearchSourceType = (typeof SEARCH_SOURCE_TYPE_VALUES)[number];

export type SearchEditedRange = (typeof SEARCH_EDITED_RANGE_VALUES)[number];

export interface SearchQueryFilters {
  /** Matches part of the page author's name. */
  readonly authorQuery?: string;
  readonly editedRange?: SearchEditedRange;
  /** Expired verifications do not count. */
  readonly verifiedOnly?: boolean;
}

export interface SearchQuery {
  readonly contentType?: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly query: string;
  readonly sourceType?: SearchSourceType;
  readonly spaceId?: string;
  readonly tags?: readonly string[];
  /** Narrows results on top of the user's own visibility; absent means visibility alone decides. */
  readonly tokenScope?: SearchTokenScope;
  readonly userId: string;
  readonly userRole: UserRole;
  readonly workspaceId: string;
}

/** Per page the nearest page rule wins, then its space's rule, then the all-spaces rule. */
export interface SearchTokenScope {
  readonly allowedPageIds: readonly string[];
  readonly closedPageIds: readonly string[];
  readonly closedSpaceIds: readonly string[];
  readonly openSpaceIds: readonly string[];
  readonly readsEverywhere: boolean;
}

export interface SearchResult {
  readonly contentType: string;
  readonly isVerified: boolean;
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
  readonly search: (query: SearchQuery & SearchQueryFilters) => Promise<SearchPage>;
}

export interface PageBlockSearchQuery extends SearchQueryFilters {
  readonly blockType?: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly query: string;
  /** Restricts the search to this page and its descendants. */
  readonly rootPageId?: string;
  readonly spaceId?: string;
  readonly tokenScope?: SearchTokenScope;
  readonly userId: string;
  readonly userRole: UserRole;
  readonly workspaceId: string;
}

export interface PageBlockSearchResult {
  readonly blockId: string;
  readonly blockType: string;
  /** Enclosing headings, outermost first. */
  readonly headingPath: readonly string[];
  readonly isPageVerified: boolean;
  readonly pageId: string;
  readonly pageTitle: string;
  readonly parentPageTitle: string | null;
  readonly rank: number;
  readonly snippet: string;
  readonly spaceId: string;
  readonly spaceName: string;
}

export interface PageBlockSearchPage {
  readonly items: readonly PageBlockSearchResult[];
  readonly nextCursor?: string;
}

export interface PageBlockSearchReader {
  /** Pages holding the block, without checking whether the caller may see them. */
  readonly locateBlock: (blockId: string, workspaceId: string) => Promise<readonly string[]>;
  readonly searchBlocks: (query: PageBlockSearchQuery) => Promise<PageBlockSearchPage>;
}
