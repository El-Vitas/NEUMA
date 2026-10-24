import { afterEach, beforeEach, describe, expect, it, jest, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_DEBOUNCE_MS } from '@/shared/constants/use-table-action.constants';

const listPageMoveDestinationsAction = mock(async (input: { readonly query: string }) => ({
  data: {
    pages: [{ id: `found-${input.query}`, spaceId: 'space-1', title: `Found ${input.query}` }],
    parentTitle: 'Handbook',
    spaces: [{ id: 'space-1', name: 'Alpha' }],
  },
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({ listPageMoveDestinationsAction }));

const { usePagesMoveDestinations } = await import('@/modules/pages/navigation/hooks/use.pages.move.destinations');

describe('usePagesMoveDestinations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    listPageMoveDestinationsAction.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('asks nothing while the list is closed', () => {
    renderHook(() => usePagesMoveDestinations(false, 'page-a', 'space-1', ''));

    expect(listPageMoveDestinationsAction).not.toHaveBeenCalled();
  });

  it('asks for the top of each space as soon as it opens, with nothing typed', async () => {
    const { result } = renderHook(() => usePagesMoveDestinations(true, 'page-a', 'space-1', ''));

    await waitFor(() => expect(result.current.spaces).toEqual([{ id: 'space-1', name: 'Alpha' }]));
    expect(listPageMoveDestinationsAction).toHaveBeenCalledWith({ pageId: 'page-a', query: '', spaceId: 'space-1' });
    expect(result.current.parentTitle).toBe('Handbook');
  });

  it('waits for the typing to pause, then asks the server for what was typed', async () => {
    const { result, rerender } = renderHook(({ query }) => usePagesMoveDestinations(true, 'page-a', 'space-1', query), {
      initialProps: { query: '' },
    });
    await waitFor(() => expect(listPageMoveDestinationsAction).toHaveBeenCalledTimes(1));

    rerender({ query: 'road' });
    rerender({ query: 'roadmap' });
    expect(listPageMoveDestinationsAction).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });

    await waitFor(() =>
      expect(result.current.pages).toEqual([{ id: 'found-roadmap', spaceId: 'space-1', title: 'Found roadmap' }]),
    );
    expect(listPageMoveDestinationsAction).toHaveBeenCalledTimes(2);
    expect(listPageMoveDestinationsAction).toHaveBeenLastCalledWith({
      pageId: 'page-a',
      query: 'roadmap',
      spaceId: 'space-1',
    });
  });
});
