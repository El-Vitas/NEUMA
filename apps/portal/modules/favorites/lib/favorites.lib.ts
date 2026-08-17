import type { FavoritePage } from '@/shared/types/favorites.types';
import type { FavoriteMoveDirection } from '../types/favorites.types';

const resolveFavoriteMoveTargetIndex = (
  favorites: readonly FavoritePage[],
  pageId: string,
  direction: FavoriteMoveDirection,
): number | null => {
  const currentIndex = favorites.findIndex((favorite) => favorite.pageId === pageId);
  if (currentIndex === -1) return null;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  return targetIndex >= 0 && targetIndex < favorites.length ? targetIndex : null;
};

export const swapFavoritePages = (
  favorites: readonly FavoritePage[],
  pageId: string,
  direction: FavoriteMoveDirection,
): readonly FavoritePage[] => {
  const currentIndex = favorites.findIndex((favorite) => favorite.pageId === pageId);
  const targetIndex = resolveFavoriteMoveTargetIndex(favorites, pageId, direction);
  if (currentIndex === -1 || targetIndex === null) return favorites;

  const current = favorites.at(currentIndex);
  const target = favorites.at(targetIndex);
  if (current === undefined || target === undefined) return favorites;

  const next = [...favorites];
  next[currentIndex] = target;
  next[targetIndex] = current;
  return next;
};

export const canMoveFavoriteUp = (favorites: readonly FavoritePage[], pageId: string): boolean =>
  resolveFavoriteMoveTargetIndex(favorites, pageId, 'up') !== null;

export const canMoveFavoriteDown = (favorites: readonly FavoritePage[], pageId: string): boolean =>
  resolveFavoriteMoveTargetIndex(favorites, pageId, 'down') !== null;
