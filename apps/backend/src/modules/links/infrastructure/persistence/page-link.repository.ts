import { Injectable } from '@nestjs/common';
import { and, type NeumaTransaction, PageLifecycle } from '@neuma/db';
import type { UserRole } from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BACKLINKS_LIST_LIMIT } from '../../constants/links.constants';
import { resolveLinkTargets } from '../../domain/page-link.domain';
import type { BacklinksResult, PageLinkReconciliationInput, PageLinkRepositoryContract } from '../../types/links.types';

@Injectable()
export class PageLinkRepository implements PageLinkRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async reconcile(input: PageLinkReconciliationInput): Promise<void> {
    const targetPageIds = resolveLinkTargets(input.sourcePageId, input.targetPageIds);
    await this.prisma.transaction(async (transaction) => {
      await this.deleteStaleLinks(transaction, input.sourcePageId, targetPageIds);
      await this.insertMissingLinks(transaction, input.sourcePageId, targetPageIds);
    });
  }

  async listBacklinks(
    targetPageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<BacklinksResult> {
    const isVisibleSpace = buildSpaceVisibilityFilter(userId, role);
    const backlinks = this.prisma.models.PageLink.where((link) =>
      and(
        link.targetPageId.eq(targetPageId),
        link.targetPage.some({ lifecycle: PageLifecycle.ACTIVE }),
        link.sourcePage.some((sourcePage) =>
          sourcePage.space.some((space) => and(space.workspaceId.eq(workspaceId), isVisibleSpace(space))),
        ),
      ),
    );
    const [rows, aggregate] = await Promise.all([
      backlinks
        .include('sourcePage', (sourcePage) => sourcePage.select('id', 'spaceId', 'title'))
        .orderBy((link) => link.createdAt.asc())
        .limit(BACKLINKS_LIST_LIMIT)
        .all(),
      backlinks.aggregate((aggregation) => ({ total: aggregation.count() })),
    ]);
    return { count: aggregate.total, items: rows.flatMap((row) => (row.sourcePage === null ? [] : [row.sourcePage])) };
  }

  private async deleteStaleLinks(
    transaction: NeumaTransaction,
    sourcePageId: string,
    targetPageIds: readonly string[],
  ): Promise<void> {
    await transaction.orm.public.PageLink.where({ sourcePageId })
      .where((link) => link.targetPageId.notIn([...targetPageIds]))
      .deleteAndCount();
  }

  private async insertMissingLinks(
    transaction: NeumaTransaction,
    sourcePageId: string,
    targetPageIds: readonly string[],
  ): Promise<void> {
    if (targetPageIds.length === 0) return;
    await transaction.orm.public.PageLink.createAndCount(
      targetPageIds.map((targetPageId) => ({ sourcePageId, targetPageId })),
      { onConflict: 'skip' },
    );
  }
}
