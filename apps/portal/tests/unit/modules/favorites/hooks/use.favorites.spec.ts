import { afterEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import type { FavoriteMoveDirection } from '@/modules/favorites/types/favorites.types';
import type { FavoritePage } from '@/shared/types/favorites.types';

const handbook: FavoritePage = {
  favoriteId: 'favorite-a',
  lifecycle: 'ACTIVE',
  order: 0,
  pageId: 'page-a',
  spaceId: 'space-a',
  title: 'Handbook',
};

const roadmap: FavoritePage = {
  favoriteId: 'favorite-b',
  lifecycle: 'ACTIVE',
  order: 1,
  pageId: 'page-b',
  spaceId: 'space-a',
  title: 'Roadmap',
};

interface MoveFavoriteInput {
  readonly direction: FavoriteMoveDirection;
  readonly pageId: string;
}

interface RemoveFavoriteInput {
  readonly pageId: string;
}

type MoveFavoriteResult = { readonly data: readonly FavoritePage[] } | { readonly serverError: string };
type RemoveFavoriteResult = { readonly data: undefined } | { readonly serverError: string };

const moveFavorite = mock(
  async (_input: MoveFavoriteInput): Promise<MoveFavoriteResult> => ({ data: [roadmap, handbook] }),
);
const removeFavorite = mock(
  async (_input: RemoveFavoriteInput): Promise<RemoveFavoriteResult> => ({ data: undefined }),
);
const refreshRouter = mock(() => undefined);

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshRouter }),
}));

mock.module('@/modules/favorites/server/actions/favorites.actions', () => ({
  moveFavoriteAction: (input: MoveFavoriteInput) => moveFavorite(input),
  removeFavoriteAction: (input: RemoveFavoriteInput) => removeFavorite(input),
}));

const { useFavorites } = await import('@/modules/favorites/hooks/use.favorites');

describe('useFavorites', () => {
  afterEach(() => {
    mock.clearAllMocks();
  });

  it('starts from the server-provided list, without fetching anything on its own', () => {
    const { result } = renderHook(() => useFavorites([handbook, roadmap]));

    expect(result.current.favorites).toEqual([handbook, roadmap]);
  });

  it('removes a favorite optimistically and asks the server to refresh once confirmed', async () => {
    const { result } = renderHook(({ favorites }) => useFavorites(favorites), {
      initialProps: { favorites: [handbook, roadmap] },
    });

    await act(async () => {
      await result.current.removeFavorite('page-a');
    });

    expect(result.current.favorites).toEqual([roadmap]);
    expect(removeFavorite).toHaveBeenCalledWith({ pageId: 'page-a' });
    expect(refreshRouter).toHaveBeenCalledTimes(1);
  });

  it('restores the removed favorite when the action fails, without refreshing', async () => {
    removeFavorite.mockImplementationOnce(async () => ({ serverError: 'unexpected' }));
    const { result } = renderHook(() => useFavorites([handbook, roadmap]));

    await act(async () => {
      await result.current.removeFavorite('page-a');
    });

    expect(result.current.favorites).toEqual([handbook, roadmap]);
    expect(refreshRouter).not.toHaveBeenCalled();
  });

  it('swaps a favorite optimistically when moved, and asks the server to refresh once confirmed', async () => {
    const { result } = renderHook(({ favorites }) => useFavorites(favorites), {
      initialProps: { favorites: [handbook, roadmap] },
    });

    await act(async () => {
      await result.current.moveFavorite('page-b', 'up');
    });

    expect(result.current.favorites).toEqual([roadmap, handbook]);
    expect(moveFavorite).toHaveBeenCalledWith({ direction: 'up', pageId: 'page-b' });
    expect(refreshRouter).toHaveBeenCalledTimes(1);
  });

  it('drops the optimistic override once a fresh server list arrives', async () => {
    const { rerender, result } = renderHook(({ favorites }) => useFavorites(favorites), {
      initialProps: { favorites: [handbook, roadmap] },
    });

    await act(async () => {
      await result.current.removeFavorite('page-a');
    });
    expect(result.current.favorites).toEqual([roadmap]);

    const refreshedList = [handbook, roadmap];
    rerender({ favorites: refreshedList });

    expect(result.current.favorites).toBe(refreshedList);
  });
});
