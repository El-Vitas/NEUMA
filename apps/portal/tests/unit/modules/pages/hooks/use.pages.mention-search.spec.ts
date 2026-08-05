import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';

const searchPageMentionCandidatesAction = mock(async (_input: { readonly query: string }) => ({
  data: [{ id: 'page-1', label: 'Target Page', spaceId: 'space-1' }],
}));

mock.module('@/modules/pages/server/actions/pages.mentions.actions', () => ({
  searchPageMentionCandidatesAction,
}));

const { usePagesMentionSearch } = await import('@/modules/pages/hooks/use.pages.mention-search');

describe('usePagesMentionSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    searchPageMentionCandidatesAction.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('returns no candidates and stays idle while there is no active query', () => {
    const { result } = renderHook(() => usePagesMentionSearch(null));

    expect(result.current.candidates).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(searchPageMentionCandidatesAction).not.toHaveBeenCalled();
  });

  it('debounces the search action and reports candidates once it resolves', async () => {
    const { result, rerender } = renderHook(({ query }) => usePagesMentionSearch(query), {
      initialProps: { query: 'ta' },
    });

    expect(result.current.isLoading).toBe(true);
    rerender({ query: 'tar' });

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });

    await waitFor(() =>
      expect(result.current.candidates).toEqual([{ id: 'page-1', label: 'Target Page', spaceId: 'space-1' }]),
    );
    expect(searchPageMentionCandidatesAction).toHaveBeenCalledTimes(1);
    expect(searchPageMentionCandidatesAction).toHaveBeenCalledWith({ query: 'tar' });
  });

  it('clears candidates once the query is dismissed', async () => {
    const { result, rerender } = renderHook(({ query }) => usePagesMentionSearch(query), {
      initialProps: { query: 'tar' as string | null },
    });

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    await waitFor(() =>
      expect(result.current.candidates).toEqual([{ id: 'page-1', label: 'Target Page', spaceId: 'space-1' }]),
    );

    rerender({ query: null });

    expect(result.current.candidates).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
