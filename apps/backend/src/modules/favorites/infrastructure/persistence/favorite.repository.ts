import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
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

const favoriteOrderBy = [
  { order: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.PageFavoriteOrderByWithRelationInput[];
const favoriteRowSelect = { id: true, order: true, pageId: true } satisfies Prisma.PageFavoriteSelect;
const accessiblePageSelect = { id: true, lifecycle: true, spaceId: true, title: true } satisfies Prisma.PageSelect;

@Injectable()
export class FavoriteRepository implements FavoriteRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: string, pageId: string): Promise<FavoriteRow> {
    const nextOrder = await this.resolveNextOrder(userId);
    return this.prisma.pageFavorite.upsert({
      create: { order: nextOrder, pageId, userId },
      select: favoriteRowSelect,
      update: {},
      where: { userIdPageId: { pageId, userId } },
    });
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
    const favorites = await this.prisma.pageFavorite.findMany({
      orderBy: [...favoriteOrderBy],
      select: favoriteRowSelect,
      where: { userId },
    });
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
    return this.prisma.$transaction(async (transaction) => {
      const favorites = await transaction.pageFavorite.findMany({
        orderBy: [...favoriteOrderBy],
        select: favoriteRowSelect,
        where: { userId },
      });
      const currentIndex = favorites.findIndex((favorite) => favorite.pageId === pageId);
      if (currentIndex === -1) return false;

      const swapIndex = resolveFavoriteSwapIndex(currentIndex, direction, favorites.length);
      if (swapIndex === null) return true;

      const current = favorites.at(currentIndex);
      const swapTarget = favorites.at(swapIndex);
      if (current === undefined || swapTarget === undefined) return false;

      await transaction.pageFavorite.update({ data: { order: swapTarget.order }, where: { id: current.id } });
      await transaction.pageFavorite.update({ data: { order: current.order }, where: { id: swapTarget.id } });
      return true;
    });
  }

  async removeFavorite(userId: string, pageId: string): Promise<void> {
    await this.prisma.pageFavorite.deleteMany({ where: { pageId, userId } });
  }

  private async findAccessiblePages(
    pageIds: readonly string[],
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly AccessibleFavoritePage[]> {
    return this.prisma.page.findMany({
      select: accessiblePageSelect,
      where: { id: { in: [...pageIds] }, space: { ...buildSpaceVisibilityFilter(userId, role), workspaceId } },
    });
  }

  private async resolveNextOrder(userId: string): Promise<number> {
    const aggregate = await this.prisma.pageFavorite.aggregate({ _max: { order: true }, where: { userId } });
    return (aggregate._max.order ?? -1) + 1;
  }
}
