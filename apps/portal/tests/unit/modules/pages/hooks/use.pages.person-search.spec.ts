import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';

const searchPagePersonCandidatesAction = mock(async (_input: { readonly query: string; readonly spaceId: string }) => ({
  data: [{ email: 'ana@example.com', id: 'person-1', name: 'Ana Pérez' }],
}));

mock.module('@/modules/pages/server/actions/pages.person.actions', () => ({
  searchPagePersonCandidatesAction,
}));

const { usePagesPersonSearch } = await import('@/modules/pages/hooks/use.pages.person-search');

describe('usePagesPersonSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    searchPagePersonCandidatesAction.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('returns no candidates and stays idle while there is no active query', () => {
    const { result } = renderHook(() => usePagesPersonSearch(null, 'space-1'));

    expect(result.current.candidates).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(searchPagePersonCandidatesAction).not.toHaveBeenCalled();
  });

  it('debounces the search action and asks for it scoped to this space', async () => {
    const { result, rerender } = renderHook(({ query }) => usePagesPersonSearch(query, 'space-1'), {
      initialProps: { query: 'an' },
    });

    expect(result.current.isLoading).toBe(true);
    rerender({ query: 'ana' });

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });

    await waitFor(() =>
      expect(result.current.candidates).toEqual([{ email: 'ana@example.com', id: 'person-1', name: 'Ana Pérez' }]),
    );
    expect(searchPagePersonCandidatesAction).toHaveBeenCalledTimes(1);
    expect(searchPagePersonCandidatesAction).toHaveBeenCalledWith({ query: 'ana', spaceId: 'space-1' });
  });

  it('clears candidates once the query is dismissed', async () => {
    const { result, rerender } = renderHook(({ query }) => usePagesPersonSearch(query, 'space-1'), {
      initialProps: { query: 'ana' as string | null },
    });

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    await waitFor(() =>
      expect(result.current.candidates).toEqual([{ email: 'ana@example.com', id: 'person-1', name: 'Ana Pérez' }]),
    );

    rerender({ query: null });

    expect(result.current.candidates).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
