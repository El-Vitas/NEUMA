import { describe, expect, test } from 'bun:test';
import { SearchService } from '@/modules/search/search.service';
import type { PageBlockRepositoryContract, PageBlockSearchQuery } from '@/modules/search/types/page-block.types';
import type {
  SearchQuery,
  SearchRepositoryContract,
  SearchResultWithContext,
} from '@/modules/search/types/search.types';

const searchResult: SearchResultWithContext = {
  contentType: 'PAGE',
  icon: null,
  isVerified: false,
  parentPageId: null,
  parentPageTitle: null,
  rank: 0.8,
  spaceId: 'space-1',
  spaceName: 'Engineering',
  sourceId: 'page-1',
  sourceType: 'PAGE',
  snippet: '<mark>Roadmap</mark>',
  title: 'Roadmap',
  updatedAt: '2026-08-02T00:00:00.000Z',
};

const unusedBlockRepository: PageBlockRepositoryContract = {
  locateBlock: () => Promise.resolve([]),
  removeBlocks: () => Promise.resolve(),
  replaceBlocks: () => Promise.resolve(),
  searchBlocks: () => Promise.resolve({ items: [] }),
};

const unusedSearchRepository: SearchRepositoryContract = {
  removeDocument: () => Promise.resolve(),
  search: () => Promise.resolve({ items: [] }),
  upsertDocument: () => Promise.resolve(),
};

const blockQuery: PageBlockSearchQuery = {
  limit: 10,
  query: 'lanzamiento',
  userId: 'user-1',
  userRole: 'WORKER',
  workspaceId: 'workspace-1',
};

describe('SearchService — blocks', () => {
  test('finds no blocks for an empty query, without asking the repository', async () => {
    const repository: PageBlockRepositoryContract = {
      ...unusedBlockRepository,
      searchBlocks: () => {
        throw new Error('empty queries must not reach the repository');
      },
    };

    const service = new SearchService(unusedSearchRepository, repository);

    expect(await service.searchBlocks({ ...blockQuery, query: '   ' })).toEqual({ items: [] });
  });

  test('passes the block query to the repository as it came', async () => {
    let received: PageBlockSearchQuery | undefined;
    const repository: PageBlockRepositoryContract = {
      ...unusedBlockRepository,
      searchBlocks: (query) => {
        received = query;
        return Promise.resolve({ items: [] });
      },
    };

    await new SearchService(unusedSearchRepository, repository).searchBlocks(blockQuery);

    expect(received).toEqual(blockQuery);
  });
});

describe('SearchService', () => {
  test('returns no results for an empty normalized query', async () => {
    const repository: SearchRepositoryContract = {
      search: (): Promise<{ items: readonly SearchResultWithContext[] }> => {
        throw new Error('empty queries must not reach the repository');
      },
      removeDocument: (): Promise<void> => Promise.resolve(),
      upsertDocument: (): Promise<void> => Promise.resolve(),
    };

    const service = new SearchService(repository, unusedBlockRepository);

    expect(
      await service.search({ limit: 20, query: '', userId: 'user-1', userRole: 'CLIENT', workspaceId: 'workspace-1' }),
    ).toEqual({ items: [] });
  });

  test('passes one authorized query contract to the repository', async () => {
    let receivedQuery: SearchQuery | undefined;
    const repository: SearchRepositoryContract = {
      search: (query): Promise<{ items: readonly SearchResultWithContext[] }> => {
        receivedQuery = query;
        return Promise.resolve({ items: [searchResult] });
      },
      removeDocument: (): Promise<void> => Promise.resolve(),
      upsertDocument: (): Promise<void> => Promise.resolve(),
    };

    const service = new SearchService(repository, unusedBlockRepository);
    const query: SearchQuery = {
      contentType: 'PAGE',
      limit: 10,
      query: 'roadmap',
      sourceType: 'PAGE',
      tags: ['planning'],
      userId: 'user-1',
      userRole: 'CLIENT',
      workspaceId: 'workspace-1',
    };

    expect(await service.search(query)).toEqual({ items: [searchResult] });
    expect(receivedQuery).toEqual(query);
  });

  test('removes an inactive projection through the repository contract', async () => {
    let receivedSourceId = '';
    const repository: SearchRepositoryContract = {
      removeDocument: (input): Promise<void> => {
        receivedSourceId = input.sourceId;
        return Promise.resolve();
      },
      search: (): Promise<{ items: readonly SearchResultWithContext[] }> => Promise.resolve({ items: [] }),
      upsertDocument: (): Promise<void> => Promise.resolve(),
    };
    const service = new SearchService(repository, unusedBlockRepository);

    await service.removeProjection({ sourceId: 'page-1', sourceType: 'PAGE', versionMarker: 1 });

    expect(receivedSourceId).toBe('page-1');
  });
});
