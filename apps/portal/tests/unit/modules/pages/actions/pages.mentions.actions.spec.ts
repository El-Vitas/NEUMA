import { describe, expect, it, mock } from 'bun:test';
import { Result } from '@company-brain/shared';
import type { SearchPage, SearchQuery } from '@/shared/types/search.types';

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
          title: 'Target Page',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }),
);

mock.module('server-only', () => ({}));
mock.module('@/shared/server/queries/search.queries', () => ({ getSearchResults }));
mock.module('@/lib/safe-action', () => ({
  actionClient: {
    inputSchema: () => ({
      action: (handler: (input: { readonly parsedInput: unknown }) => Promise<unknown>) => async (input: unknown) => {
        try {
          return { data: await handler({ parsedInput: input }) };
        } catch (error) {
          return { serverError: error instanceof Error ? error.message : 'unknown error' };
        }
      },
    }),
  },
}));
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

const { searchPageMentionCandidatesAction } = await import('@/modules/pages/server/actions/pages.mentions.actions');

describe('searchPageMentionCandidatesAction', () => {
  it('maps search results scoped to pages into mention candidates', async () => {
    getSearchResults.mockClear();

    const result = await searchPageMentionCandidatesAction({ query: 'tar' });

    expect(result).toEqual({ data: [{ id: 'page-1', label: 'Target Page', spaceId: 'space-1' }] });
    expect(getSearchResults).toHaveBeenCalledWith(expect.objectContaining({ query: 'tar', sourceType: 'PAGE' }));
  });

  it('surfaces a search failure as a server error', async () => {
    getSearchResults.mockClear();
    getSearchResults.mockImplementationOnce(async () => Result.fail(new Error('search unavailable')));

    const result = await searchPageMentionCandidatesAction({ query: 'tar' });

    expect(result).toEqual({ serverError: 'search unavailable' });
  });
});
