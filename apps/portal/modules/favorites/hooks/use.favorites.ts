'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import type { FavoritePage } from '@/shared/types/favorites.types';
import { swapFavoritePages } from '../lib/favorites.lib';
import { moveFavoriteAction, removeFavoriteAction } from '../server/actions/favorites.actions';
import type { FavoriteMoveDirection, FavoritesOverride, UseFavoritesResult } from '../types/favorites.types';

/** Holds the optimistic edit until the server list changes, then drops it. */
export const useFavorites = (serverFavorites: readonly FavoritePage[]): UseFavoritesResult => {
  const router = useRouter();
  const [override, setOverride] = useState<FavoritesOverride | null>(null);
  const favorites = override !== null && override.source === serverFavorites ? override.favorites : serverFavorites;

  const removeFavorite = useCallback(
    async (pageId: string): Promise<boolean> => {
      setOverride({ favorites: favorites.filter((favorite) => favorite.pageId !== pageId), source: serverFavorites });

      const result = await removeFavoriteAction({ pageId });
      if (hasActionError(result)) {
        setOverride({ favorites, source: serverFavorites });
        return false;
      }
      router.refresh();
      return true;
    },
    [favorites, router, serverFavorites],
  );

  const moveFavorite = useCallback(
    async (pageId: string, direction: FavoriteMoveDirection): Promise<boolean> => {
      setOverride({ favorites: swapFavoritePages(favorites, pageId, direction), source: serverFavorites });

      const result = await moveFavoriteAction({ direction, pageId });
      if (!isActionSuccess<readonly FavoritePage[]>(result)) {
        setOverride({ favorites, source: serverFavorites });
        return false;
      }
      router.refresh();
      return true;
    },
    [favorites, router, serverFavorites],
  );

  return { favorites, moveFavorite, removeFavorite };
};
