import { Injectable } from '@nestjs/common';
import { and } from '@neuma/db';
import type { UserRole } from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { mapFavoritesToPageSummaries, resolveFavoriteSwapIndex } from '../../domain/favorite.domain';
import type {
  AccessibleFavoritePage,
  FavoriteMoveDirection,
  FavoritePageSummary,
  FavoriteRow,
} from '../../domain/favorite.domain.types';
import type { FavoriteRepositoryContract } from '../../types/favorite.types';

@Injectable()
export class FavoriteRepository implements FavoriteRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, pageId: string): Promise<FavoriteRow> {
    const nextOrder = await this.resolveNextOrder(userId);
    const favorites = this.prisma.models.PageFavorite;
    await favorites.createAndCount([{ order: nextOrder, pageId, userId }], { onConflict: 'skip' });
    const favorite = await favorites.where({ pageId, userId }).select('id', 'order', 'pageId').first();
    if (favorite === null) throw new Error(`Favorite for page ${pageId} and user ${userId} missing after insert`);
    return favorite;
  }

  async findAccessiblePage(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<AccessibleFavoritePage | null> {
    const pages = await this.findAccessiblePages([pageId], workspaceId, userId, role);
    return pages.at(0) ?? null;
  }

  async listFavorites(userId: string, workspaceId: string, role: UserRole): Promise<readonly FavoritePageSummary[]> {
    const favorites = await this.prisma.models.PageFavorite.where({ userId })
      .select('id', 'order', 'pageId')
      .orderBy([(favorite) => favorite.order.asc(), (favorite) => favorite.createdAt.asc()])
      .all();
    if (favorites.length === 0) return [];
    const accessiblePages = await this.findAccessiblePages(
      favorites.map((favorite) => favorite.pageId),
      workspaceId,
      userId,
      role,
    );
    return mapFavoritesToPageSummaries(favorites, accessiblePages);
  }

  async moveFavorite(userId: string, pageId: string, direction: FavoriteMoveDirection): Promise<boolean> {
    return this.prisma.transaction(async (transaction) => {
      const favorites = await transaction.orm.public.PageFavorite.where({ userId })
        .select('id', 'order', 'pageId')
        .orderBy([(favorite) => favorite.order.asc(), (favorite) => favorite.createdAt.asc()])
        .all();
      const currentIndex = favorites.findIndex((favorite) => favorite.pageId === pageId);
      if (currentIndex === -1) return false;

      const swapIndex = resolveFavoriteSwapIndex(currentIndex, direction, favorites.length);
      if (swapIndex === null) return true;

      const current = favorites.at(currentIndex);
      const swapTarget = favorites.at(swapIndex);
      if (current === undefined || swapTarget === undefined) return false;

      await transaction.orm.public.PageFavorite.where({ id: current.id }).update({ order: swapTarget.order });
      await transaction.orm.public.PageFavorite.where({ id: swapTarget.id }).update({ order: current.order });
      return true;
    });
  }

  async removeFavorite(userId: string, pageId: string): Promise<void> {
    await this.prisma.models.PageFavorite.where({ pageId, userId }).deleteAndCount();
  }

  private async findAccessiblePages(
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly AccessibleFavoritePage[]> {
    const isVisibleSpace = buildSpaceVisibilityFilter(userId, role);
    return this.prisma.models.Page.where((page) => page.id.in([...pageIds]))
      .where((page) => page.space.some((space) => and(space.workspaceId.eq(workspaceId), isVisibleSpace(space))))
      .select('id', 'lifecycle', 'spaceId', 'title')
      .all();
  }

  private async resolveNextOrder(userId: string): Promise<number> {
    const aggregate = await this.prisma.models.PageFavorite.where({ userId }).aggregate((agg) => ({
      highestOrder: agg.max('order'),
    }));
    return (aggregate.highestOrder ?? -1) + 1;
  }
}
