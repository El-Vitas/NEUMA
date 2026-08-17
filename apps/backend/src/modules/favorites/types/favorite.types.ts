import type { UserRole } from '@company-brain/shared';
import type {
  AccessibleFavoritePage,
  FavoriteMoveDirection,
  FavoritePageSummary,
  FavoriteRow,
} from '../domain/favorite.domain.types';

export interface FavoriteRepositoryContract {
  readonly addFavorite: (userId: string, pageId: string) => Promise<FavoriteRow>;
  readonly findAccessiblePage: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<AccessibleFavoritePage | null>;
  readonly listFavorites: (
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<readonly FavoritePageSummary[]>;
  readonly moveFavorite: (userId: string, pageId: string, direction: FavoriteMoveDirection) => Promise<boolean>;
  readonly removeFavorite: (userId: string, pageId: string) => Promise<void>;
}
