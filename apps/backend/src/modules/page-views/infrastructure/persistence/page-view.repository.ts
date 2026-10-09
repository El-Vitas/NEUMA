import { Injectable } from '@nestjs/common';
import type { Prisma } from '@neuma/db/generated';
import type { UserRole } from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PageViewEntry, PageViewRepositoryContract } from '../../types/page-view.types';

const viewerSelect = { user: { select: { id: true, name: true } }, viewedAt: true } satisfies Prisma.PageViewSelect;

@Injectable()
export class PageViewRepository implements PageViewRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async countViews(pageId: string): Promise<number> {
    return this.prisma.pageView.count({ where: { pageId } });
  }

  async createView(pageId: string, userId: string): Promise<void> {
    await this.prisma.pageView.create({ data: { pageId, userId } });
  }

  async findAccessiblePageId(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<null | string> {
    const page = await this.prisma.page.findFirst({
      select: { id: true },
      where: { id: pageId, space: { ...buildSpaceVisibilityFilter(userId, role), workspaceId } },
    });
    return page?.id ?? null;
  }

  async findLastViewedAt(pageId: string, userId: string): Promise<Date | null> {
    const lastView = await this.prisma.pageView.findFirst({
      orderBy: { viewedAt: 'desc' },
      select: { viewedAt: true },
      where: { pageId, userId },
    });
    return lastView?.viewedAt ?? null;
  }

  async getPageViewsEnabled(workspaceId: string): Promise<boolean> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      select: { pageViewsEnabled: true },
      where: { id: workspaceId },
    });
    return workspace.pageViewsEnabled;
  }

  async listViews(pageId: string, limit: number): Promise<readonly PageViewEntry[]> {
    const views = await this.prisma.pageView.findMany({
      orderBy: { viewedAt: 'desc' },
      select: viewerSelect,
      take: limit,
      where: { pageId },
    });
    return views.map((view) => ({ id: view.user.id, name: view.user.name, viewedAt: view.viewedAt }));
  }

  async setPageViewsEnabled(workspaceId: string, enabled: boolean): Promise<boolean> {
    const workspace = await this.prisma.workspace.update({
      data: { pageViewsEnabled: enabled },
      select: { pageViewsEnabled: true },
      where: { id: workspaceId },
    });
    return workspace.pageViewsEnabled;
  }
}
