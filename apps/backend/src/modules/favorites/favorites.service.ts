import { Inject, Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { Result } from '@neuma/shared';
import { FAVORITE_REPOSITORY } from './constants/favorites.constants';
import type { FavoriteMoveDirection, FavoritePageSummary } from './domain/favorite.domain.types';
import { FavoriteNotFoundError, FavoritePageAccessDeniedError } from './domain/favorite.error';
import type { FavoriteRepositoryContract } from './types/favorite.types';

@Injectable()
export class FavoritesService {
  constructor(@Inject(FAVORITE_REPOSITORY) private readonly favoriteRepository: FavoriteRepositoryContract) {}

  async addFavorite(
    pageId: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<FavoritePageSummary, FavoritePageAccessDeniedError>> {
    const accessiblePage = await this.favoriteRepository.findAccessiblePage(pageId, workspaceId, userId, role);
    if (accessiblePage === null) {
      return Result.fail(new FavoritePageAccessDeniedError());
    }
    const favorite = await this.favoriteRepository.addFavorite(userId, pageId);
    return Result.ok({
      favoriteId: favorite.id,
      lifecycle: accessiblePage.lifecycle,
      order: favorite.order,
      pageId: accessiblePage.id,
      spaceId: accessiblePage.spaceId,
      title: accessiblePage.title,
    });
  }

  async listFavorites(userId: string, workspaceId: string, role: UserRole): Promise<readonly FavoritePageSummary[]> {
    return this.favoriteRepository.listFavorites(userId, workspaceId, role);
  }

  async moveFavorite(
    pageId: string,
    direction: FavoriteMoveDirection,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<readonly FavoritePageSummary[], FavoriteNotFoundError>> {
    const moved = await this.favoriteRepository.moveFavorite(userId, pageId, direction);
    if (!moved) {
      return Result.fail(new FavoriteNotFoundError());
    }
    return Result.ok(await this.favoriteRepository.listFavorites(userId, workspaceId, role));
  }

  async removeFavorite(pageId: string, userId: string): Promise<void> {
    await this.favoriteRepository.removeFavorite(userId, pageId);
  }
}
