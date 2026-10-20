import { describe, expect, test } from 'bun:test';
import { SearchService } from '@/modules/search/search.service';
import type {
  PageBlockSearchQuery,
  SearchCandidate,
  SearchCandidateRequest,
  SearchRepositoryContract,
} from '@/modules/search/types/search.types';
import { decodeSearchCursor } from '@/modules/search/utils/search.cursor.utils';

const candidate = (blockId: string, rank: number): SearchCandidate => ({
  blockId,
  blockType: 'paragraph',
  chain: [],
  editedAt: new Date('2026-10-20T00:00:00.000Z'),
  headings: [{ level: 1, text: 'Setup' }],
  icon: null,
  isPageVerified: false,
  pageChain: [],
  pageId: `page-of-${blockId}`,
  pageParentId: null,
  pageRank: rank,
  pageTitle: 'Roadmap',
  parentPageTitle: null,
  rank,
  snippet: '<mark>Roadmap</mark>',
  spaceId: 'space-1',
  spaceName: 'Engineering',
});

const blockQuery: PageBlockSearchQuery = {
  limit: 2,
  query: 'lanzamiento',
  userId: 'user-1',
  userRole: 'WORKER',
  workspaceId: 'workspace-1',
};

const repositoryAnswering = (
  answer: (request: SearchCandidateRequest) => readonly SearchCandidate[],
  requests: SearchCandidateRequest[] = [],
): SearchRepositoryContract => ({
  findCandidates: (request) => {
    requests.push(request);
    return Promise.resolve(answer(request));
  },
  locateBlock: () => Promise.resolve([]),
});

describe('SearchService', () => {
  test('finds nothing for an empty query, without asking the repository', async () => {
    const requests: SearchCandidateRequest[] = [];
    const service = new SearchService(repositoryAnswering(() => [candidate('a', 1)], requests));

    expect(await service.searchBlocks({ ...blockQuery, query: '   ' })).toEqual({ items: [] });
    expect(await service.search({ ...blockQuery, query: '' })).toEqual({ items: [] });
    expect(requests).toEqual([]);
  });

  test('finds no pages for a content type other than pages', async () => {
    const requests: SearchCandidateRequest[] = [];
    const service = new SearchService(repositoryAnswering(() => [candidate('a', 1)], requests));

    expect(await service.search({ ...blockQuery, contentType: 'FILE' })).toEqual({ items: [] });
    expect(requests).toEqual([]);
  });

  test('answers a page of blocks with the heading path and a single statement', async () => {
    const requests: SearchCandidateRequest[] = [];
    const service = new SearchService(repositoryAnswering(() => [candidate('a', 1)], requests));

    const page = await service.searchBlocks(blockQuery);

    expect(page.items.map((item) => item.blockId)).toEqual(['a']);
    expect(page.items[0]?.headingPath).toEqual(['Setup']);
    expect(page.nextCursor).toBeUndefined();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.granularity).toBe('block');
  });

  test('answers pages as results of the page, stood for by their best block', async () => {
    const service = new SearchService(repositoryAnswering(() => [candidate('a', 1)]));

    const page = await service.search({ ...blockQuery, contentType: 'PAGE' });

    expect(page.items[0]).toMatchObject({ sourceId: 'page-of-a', sourceType: 'PAGE', title: 'Roadmap' });
  });

  test('hands out a cursor on the last result when more were fetched than a page holds', async () => {
    const rows = [candidate('a', 3), candidate('b', 2), candidate('c', 1)];
    const service = new SearchService(repositoryAnswering(() => rows));

    const page = await service.searchBlocks(blockQuery);

    expect(page.items.map((item) => item.blockId)).toEqual(['a', 'b']);
    expect(decodeSearchCursor(page.nextCursor)).toEqual({ id: 'b', matching: 'words', rank: 2 });
  });

  test('starts the next statement from the cursor it was given', async () => {
    const requests: SearchCandidateRequest[] = [];
    const service = new SearchService(repositoryAnswering(() => [], requests));
    const cursor = Buffer.from(JSON.stringify({ id: 'b', matching: 'words', rank: 2 })).toString('base64url');

    await service.searchBlocks({ ...blockQuery, cursor });

    expect(requests[0]?.cursor).toEqual({ id: 'b', rank: 2 });
  });

  test('looks for a typo only when the words found nothing', async () => {
    const requests: SearchCandidateRequest[] = [];
    const service = new SearchService(
      repositoryAnswering((request) => (request.matching === 'typo' ? [candidate('a', 0.6)] : []), requests),
    );

    const page = await service.searchBlocks(blockQuery);

    expect(requests.map((request) => request.matching)).toEqual(['words', 'typo']);
    expect(page.items.map((item) => item.blockId)).toEqual(['a']);
  });

  test('asks again from where it stopped when the rows fetched were hidden from the viewer', async () => {
    const hiddenRow: SearchCandidate = {
      ...candidate('hidden', 5),
      chain: [{ depth: 1, id: 'secret', permissions: [] }],
    };
    const requests: SearchCandidateRequest[] = [];
    const service = new SearchService(
      repositoryAnswering(
        (request) =>
          request.cursor === null ? [hiddenRow, hiddenRow, hiddenRow, hiddenRow, hiddenRow] : [candidate('a', 1)],
        requests,
      ),
    );

    const page = await service.searchBlocks(blockQuery);

    expect(page.items.map((item) => item.blockId)).toEqual(['a']);
    expect(requests).toHaveLength(2);
    expect(requests[1]?.cursor).toEqual({ id: 'hidden', rank: 5 });
  });
});
