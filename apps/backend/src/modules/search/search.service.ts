import { Inject, Injectable } from '@nestjs/common';
import type { BlockViewer } from '@neuma/shared';
import { SEARCH_MAX_ROUNDS, SEARCH_OVERFETCH_FACTOR, SEARCH_RESULT_CONTENT_TYPE } from './constants/search.constants';
import { SEARCH_REPOSITORY } from './constants/search.tokens';
import { mayHaveMoreRows, takeReadable } from './domain/search.paging.domain';
import type {
  CollectedPage,
  CollectRequest,
  PageBlockSearchPage,
  PageBlockSearchQuery,
  PageBlockSearchReader,
  SearchCandidate,
  SearchCursorPosition,
  SearchMatching,
  SearchPageWithContext,
  SearchQueryWithFilters,
  SearchReader,
  SearchRepositoryContract,
} from './types/search.types';
import { decodeSearchCursor, encodeSearchCursor } from './utils/search.cursor.utils';
import { toBlockResult, toCursor, toPageResult, toPosition } from './utils/search.result.utils';

const withCursor = <Page extends { readonly items: readonly unknown[] }>(
  page: Page,
  nextCursor: string | undefined,
): Page & { readonly nextCursor?: string } => (nextCursor === undefined ? page : { ...page, nextCursor });

@Injectable()
export class SearchService implements SearchReader, PageBlockSearchReader {
  constructor(@Inject(SEARCH_REPOSITORY) private readonly searchRepository: SearchRepositoryContract) {}

  async search(query: SearchQueryWithFilters): Promise<SearchPageWithContext> {
    if (query.query.trim() === '' || !this.isAboutPages(query.contentType)) return { items: [] };
    const collected = await this.collect({
      cursor: query.cursor,
      granularity: 'page',
      limit: query.limit,
      query,
    });
    return withCursor({ items: collected.items.map(toPageResult) }, collected.nextCursor);
  }

  async searchBlocks(query: PageBlockSearchQuery): Promise<PageBlockSearchPage> {
    if (query.query.trim() === '') return { items: [] };
    const collected = await this.collect({ cursor: query.cursor, granularity: 'block', limit: query.limit, query });
    return withCursor({ items: collected.items.map(toBlockResult) }, collected.nextCursor);
  }

  locateBlock(blockId: string, workspaceId: string): Promise<readonly string[]> {
    return this.searchRepository.locateBlock(blockId, workspaceId);
  }

  private isAboutPages(contentType: string | undefined): boolean {
    return contentType === undefined || contentType === SEARCH_RESULT_CONTENT_TYPE;
  }

  /** A typo is looked for only when the words found nothing, and a cursor stays in the mode that produced it. */
  private async collect(request: CollectRequest): Promise<CollectedPage> {
    const cursor = decodeSearchCursor(request.cursor);
    if (cursor !== null) return this.collectFrom(request, cursor.matching, { id: cursor.id, rank: cursor.rank });
    const words = await this.collectFrom(request, 'words', null);
    return words.items.length > 0 ? words : this.collectFrom(request, 'typo', null);
  }

  /**
   * Fetches more rows than a page holds and keeps the readable ones; when too many are hidden it asks again from
   * where it stopped, up to a bound. The common case, where nothing is hidden, takes one statement.
   */
  private async collectFrom(
    request: CollectRequest,
    matching: SearchMatching,
    start: SearchCursorPosition | null,
  ): Promise<CollectedPage> {
    const { granularity, limit, query } = request;
    const fetchSize = limit * SEARCH_OVERFETCH_FACTOR + 1;
    const viewer: BlockViewer = { userId: query.userId, workspaceRole: query.userRole };
    const items: SearchCandidate[] = [];
    let position = start;
    for (let round = 0; round < SEARCH_MAX_ROUNDS; round += 1) {
      const rows = await this.searchRepository.findCandidates({
        cursor: position,
        fetchSize,
        granularity,
        matching,
        query,
      });
      const { hasSurplus, taken } = takeReadable(rows, viewer, limit - items.length, granularity);
      items.push(...taken);
      const lastRow = rows.at(-1);
      const lastTaken = items.at(-1);
      if (hasSurplus && lastTaken !== undefined) {
        return { items, nextCursor: encodeSearchCursor(toCursor(lastTaken, granularity, matching)) };
      }
      if (lastRow === undefined || !mayHaveMoreRows(rows, fetchSize, granularity)) {
        return { items, nextCursor: undefined };
      }
      position = toPosition(lastRow, granularity);
      if (items.length >= limit) break;
    }
    return { items, nextCursor: position === null ? undefined : encodeSearchCursor({ ...position, matching }) };
  }
}
