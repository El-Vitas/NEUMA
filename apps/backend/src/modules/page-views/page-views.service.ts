import { Inject, Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { canManageWorkspace, Result } from '@neuma/shared';
import { Logger } from 'nestjs-pino';
import { PAGE_VIEW_COOLDOWN_MS, PAGE_VIEW_LIST_LIMIT, PAGE_VIEW_REPOSITORY } from './constants/page-views.constants';
import { shouldRecordPageView } from './domain/page-view.domain';
import { PageViewsAccessDeniedError, PageViewsPageNotAccessibleError } from './domain/page-view.error';
import type { PageViewRepositoryContract, PageViewsSettings, PageViewsUsageSummary } from './types/page-view.types';

@Injectable()
export class PageViewsService {
  constructor(
    @Inject(PAGE_VIEW_REPOSITORY) private readonly pageViewRepository: PageViewRepositoryContract,
    private readonly logger: Logger,
  ) {}

  async getSettings(
    workspaceId: string,
    role: UserRole,
  ): Promise<Result<PageViewsSettings, PageViewsAccessDeniedError>> {
    if (!canManageWorkspace(role)) return Result.fail(new PageViewsAccessDeniedError());
    const enabled = await this.pageViewRepository.getPageViewsEnabled(workspaceId);
    return Result.ok({ enabled });
  }

  async getUsageSummary(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageViewsUsageSummary, PageViewsAccessDeniedError | PageViewsPageNotAccessibleError>> {
    if (!canManageWorkspace(role)) return Result.fail(new PageViewsAccessDeniedError());
    const accessiblePageId = await this.pageViewRepository.findAccessiblePageId(pageId, workspaceId, userId, role);
    if (accessiblePageId === null) return Result.fail(new PageViewsPageNotAccessibleError());

    const [viewCount, viewers] = await Promise.all([
      this.pageViewRepository.countViews(pageId),
      this.pageViewRepository.listViews(pageId, PAGE_VIEW_LIST_LIMIT),
    ]);
    return Result.ok({ viewCount, viewers });
  }

  /** Failures are logged, not surfaced: the caller already has the page and must not fail because of this write. */
  async recordView(pageId: string, workspaceId: string, userId: string, role: UserRole): Promise<void> {
    try {
      const enabled = await this.pageViewRepository.getPageViewsEnabled(workspaceId);
      if (!enabled) return;

      const accessiblePageId = await this.pageViewRepository.findAccessiblePageId(pageId, workspaceId, userId, role);
      if (accessiblePageId === null) return;

      const lastViewedAt = await this.pageViewRepository.findLastViewedAt(pageId, userId);
      if (!shouldRecordPageView(lastViewedAt, new Date(), PAGE_VIEW_COOLDOWN_MS)) return;

      await this.pageViewRepository.createView(pageId, userId);
    } catch (error) {
      this.logger.error({ err: error, pageId, userId }, 'Failed to record page view');
    }
  }

  async updateSettings(
    workspaceId: string,
    role: UserRole,
    enabled: boolean,
  ): Promise<Result<PageViewsSettings, PageViewsAccessDeniedError>> {
    if (!canManageWorkspace(role)) return Result.fail(new PageViewsAccessDeniedError());
    const updatedEnabled = await this.pageViewRepository.setPageViewsEnabled(workspaceId, enabled);
    return Result.ok({ enabled: updatedEnabled });
  }
}
