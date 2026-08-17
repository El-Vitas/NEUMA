import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';

const searchInstantPageCandidatesAction = mock(async (_input: { readonly query: string }) => ({
  data: [{ id: 'page-1', spaceId: 'space-1', title: 'Onboarding plan' }],
}));

mock.module('@/modules/search/server/actions/search.instant.actions', () => ({
  searchInstantPageCandidatesAction,
}));

const { useCommandBarSearch } = await import('@/shared/hooks/use.command-bar-search.hook');

describe('useCommandBarSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    searchInstantPageCandidatesAction.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('stays idle and empty while the query is blank', () => {
    const { result } = renderHook(() => useCommandBarSearch(''));

    expect(result.current.pages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(searchInstantPageCandidatesAction).not.toHaveBeenCalled();
  });

  it('debounces the search action and reports matching pages once it resolves', async () => {
    const { result, rerender } = renderHook(({ query }) => useCommandBarSearch(query), {
      initialProps: { query: 'onb' },
    });

    expect(result.current.isLoading).toBe(true);
    rerender({ query: 'onboarding' });

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });

    await waitFor(() =>
      expect(result.current.pages).toEqual([{ id: 'page-1', spaceId: 'space-1', title: 'Onboarding plan' }]),
    );
    expect(searchInstantPageCandidatesAction).toHaveBeenCalledTimes(1);
    expect(searchInstantPageCandidatesAction).toHaveBeenCalledWith({ query: 'onboarding' });
  });

  it('clears the results once the query is emptied again', async () => {
    const { result, rerender } = renderHook(({ query }) => useCommandBarSearch(query), {
      initialProps: { query: 'onboarding' },
    });

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    await waitFor(() =>
      expect(result.current.pages).toEqual([{ id: 'page-1', spaceId: 'space-1', title: 'Onboarding plan' }]),
    );

    rerender({ query: '' });

    expect(result.current.pages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
