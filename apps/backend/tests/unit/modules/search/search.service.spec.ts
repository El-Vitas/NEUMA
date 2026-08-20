import { describe, expect, test } from 'bun:test';
import { SearchService } from '@/modules/search/search.service';
import type {
  SearchQuery,
  SearchRepositoryContract,
  SearchResultWithContext,
} from '@/modules/search/types/search.types';

const searchResult: SearchResultWithContext = {
  contentType: 'PAGE',
  icon: null,
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

describe('SearchService', () => {
  test('returns no results for an empty normalized query', async () => {
    const repository: SearchRepositoryContract = {
      search: (): Promise<{ items: readonly SearchResultWithContext[] }> => {
        throw new Error('empty queries must not reach the repository');
      },
      removeDocument: (): Promise<void> => Promise.resolve(),
      upsertDocument: (): Promise<void> => Promise.resolve(),
    };

    const service = new SearchService(repository);

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

    const service = new SearchService(repository);
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
    const service = new SearchService(repository);

    await service.removeProjection({ sourceId: 'page-1', sourceType: 'PAGE', versionMarker: 1 });

    expect(receivedSourceId).toBe('page-1');
  });
});
