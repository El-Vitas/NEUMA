import { parseStoredPageIcon } from '../../../common/domain/page-icon.domain';
import type { PageBlockSearchResult } from '../../../common/types/search.types';
import { SEARCH_RESULT_CONTENT_TYPE } from '../constants/search.constants';
import { buildHeadingPath } from '../domain/search.access.domain';
import type {
  SearchCandidate,
  SearchCursor,
  SearchCursorPosition,
  SearchGranularity,
  SearchMatching,
  SearchResultWithContext,
} from '../types/search.types';

export const toBlockResult = (candidate: SearchCandidate): PageBlockSearchResult => ({
  blockId: candidate.blockId,
  blockType: candidate.blockType,
  headingPath: buildHeadingPath(candidate.headings),
  isPageVerified: candidate.isPageVerified,
  pageId: candidate.pageId,
  pageTitle: candidate.pageTitle,
  parentPageTitle: candidate.parentPageTitle,
  rank: candidate.rank,
  snippet: candidate.snippet,
  spaceId: candidate.spaceId,
  spaceName: candidate.spaceName,
});

export const toPageResult = (candidate: SearchCandidate): SearchResultWithContext => ({
  contentType: SEARCH_RESULT_CONTENT_TYPE,
  icon: parseStoredPageIcon(candidate.icon),
  isVerified: candidate.isPageVerified,
  parentPageId: candidate.parentPageTitle === null ? null : candidate.pageParentId,
  parentPageTitle: candidate.parentPageTitle,
  rank: candidate.rank,
  snippet: candidate.snippet,
  sourceId: candidate.pageId,
  sourceType: 'PAGE',
  spaceId: candidate.spaceId,
  spaceName: candidate.spaceName,
  title: candidate.pageTitle,
  updatedAt: candidate.editedAt.toISOString(),
});

/** Where the next page starts: after this result, in the order the statement sorts by. */
export const toPosition = (candidate: SearchCandidate, granularity: SearchGranularity): SearchCursorPosition => ({
  id: granularity === 'page' ? candidate.pageId : candidate.blockId,
  rank: candidate.pageRank,
});

export const toCursor = (
  candidate: SearchCandidate,
  granularity: SearchGranularity,
  matching: SearchMatching,
): SearchCursor => ({ ...toPosition(candidate, granularity), matching });
