import { Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { BlockAccessRepository } from '../../../../common/infrastructure/persistence/block-access.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PageViewEntry, PageViewRepositoryContract } from '../../types/page-view.types';

@Injectable()
export class PageViewRepository implements PageViewRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockAccess: BlockAccessRepository,
  ) {}

  async countViews(pageId: string): Promise<number> {
    const { total } = await this.prisma.models.PageView.where({ pageId }).aggregate((agg) => ({ total: agg.count() }));
    return total;
  }

  async createView(pageId: string, userId: string): Promise<void> {
    await this.prisma.models.PageView.create({ pageId, userId });
  }

  async findAccessiblePageId(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<null | string> {
    const pages = await this.blockAccess.findReadablePages([pageId], { role, userId, workspaceId });
    return pages.at(0)?.id ?? null;
  }

  async findLastViewedAt(pageId: string, userId: string): Promise<Date | null> {
    const lastView = await this.prisma.models.PageView.where({ pageId, userId })
      .select('viewedAt')
      .orderBy((view) => view.viewedAt.desc())
      .first();
    return lastView?.viewedAt ?? null;
  }

  async getPageViewsEnabled(workspaceId: string): Promise<boolean> {
    const workspace = await this.prisma.models.Workspace.where({ id: workspaceId }).select('pageViewsEnabled').first();
    if (workspace === null) throw new Error(`Workspace ${workspaceId} not found while reading its page views setting`);
    return workspace.pageViewsEnabled;
  }

  async listViews(pageId: string, limit: number): Promise<readonly PageViewEntry[]> {
    const views = await this.prisma.models.PageView.where({ pageId })
      .select('userId', 'viewedAt')
      .orderBy((view) => view.viewedAt.desc())
      .limit(limit)
      .include('user', (user) => user.select('id', 'name'))
      .all();
    return views.flatMap(({ user, viewedAt }) => (user === null ? [] : [{ id: user.id, name: user.name, viewedAt }]));
  }

  async setPageViewsEnabled(workspaceId: string, enabled: boolean): Promise<boolean> {
    const workspace = await this.prisma.models.Workspace.where({ id: workspaceId }).update({
      pageViewsEnabled: enabled,
    });
    if (workspace === null) throw new Error(`Workspace ${workspaceId} not found while updating its page views setting`);
    return workspace.pageViewsEnabled;
  }
}
