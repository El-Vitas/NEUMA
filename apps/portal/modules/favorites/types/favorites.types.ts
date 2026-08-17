import type { FavoritePage } from '@/shared/types/favorites.types';
import type { FAVORITE_MOVE_DIRECTIONS } from '../constants/favorites.constants';

export type FavoriteMoveDirection = (typeof FAVORITE_MOVE_DIRECTIONS)[number];

export interface FavoritesOverride {
  readonly favorites: readonly FavoritePage[];
  readonly source: readonly FavoritePage[];
}

export interface UseFavoritesResult {
  readonly favorites: readonly FavoritePage[];
  readonly moveFavorite: (pageId: string, direction: FavoriteMoveDirection) => Promise<boolean>;
  readonly removeFavorite: (pageId: string) => Promise<boolean>;
}
