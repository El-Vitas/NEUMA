'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import type { FavoritePage } from '@/shared/types/favorites.types';
import { swapFavoritePages } from '../lib/favorites.lib';
import { moveFavoriteAction, removeFavoriteAction } from '../server/actions/favorites.actions';
import type { FavoriteMoveDirection, FavoritesOverride, UseFavoritesResult } from '../types/favorites.types';

/**
 * Favorites arrive from the server as props, already fresh for this render.
 * This hook only carries the optimistic edit between a click and the moment
 * the mutation resolves — once the server list moves on, the override is let
 * go rather than fought.
 */
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
