import { describe, expect, it, mock } from 'bun:test';
import { Result } from '@company-brain/shared';
import type { SearchPage, SearchQuery } from '@/shared/types/search.types';
import { createSafeActionMock } from '../../../../mocks/safe-action.mock';

const getSearchResults = mock(
  async (_params: SearchQuery): Promise<ReturnType<typeof Result.ok<SearchPage, Error>>> =>
    Result.ok({
      items: [
        {
          contentType: 'page',
          rank: 1,
          snippet: [],
          sourceId: 'page-1',
          sourceType: 'PAGE',
          spaceId: 'space-1',
          title: 'Onboarding plan',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }),
);

mock.module('server-only', () => ({}));
mock.module('@/shared/server/queries/search.queries', () => ({ getSearchResults }));
mock.module('@/lib/safe-action', createSafeActionMock);
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

const { searchInstantPageCandidatesAction } = await import('@/modules/search/server/actions/search.instant.actions');

describe('searchInstantPageCandidatesAction', () => {
  it('maps page search results into quick finder candidates', async () => {
    getSearchResults.mockClear();

    const result = await searchInstantPageCandidatesAction({ query: 'onboarding' });

    expect(result).toEqual({ data: [{ id: 'page-1', spaceId: 'space-1', title: 'Onboarding plan' }] });
    expect(getSearchResults).toHaveBeenCalledWith(expect.objectContaining({ query: 'onboarding', sourceType: 'PAGE' }));
  });

  it('skips the search entirely for a blank query', async () => {
    getSearchResults.mockClear();

    const result = await searchInstantPageCandidatesAction({ query: '' });

    expect(result).toEqual({ data: [] });
    expect(getSearchResults).not.toHaveBeenCalled();
  });

  it('surfaces a search failure as a server error', async () => {
    getSearchResults.mockClear();
    getSearchResults.mockImplementationOnce(async () => Result.fail(new Error('search unavailable')));

    const result = await searchInstantPageCandidatesAction({ query: 'onboarding' });

    expect(result).toEqual({ serverError: 'unexpected' });
  });
});
