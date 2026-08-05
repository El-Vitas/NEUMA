import { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { resolveLinkTargets } from '../../domain/page-link.domain';
import type { BacklinksResult, PageLinkReconciliationInput, PageLinkRepositoryContract } from '../../types/links.types';

@Injectable()
export class PageLinkRepository implements PageLinkRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  async reconcile(input: PageLinkReconciliationInput): Promise<void> {
    const targetPageIds = resolveLinkTargets(input.sourcePageId, input.targetPageIds);
    await this.prisma.$transaction(async (transaction) => {
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
    const rows = await this.prisma.pageLink.findMany({
      orderBy: { createdAt: 'asc' },
      select: { sourcePage: { select: { id: true, spaceId: true, title: true } } },
      where: {
        sourcePage: { space: { ...buildSpaceVisibilityFilter(userId, role), workspaceId } },
        targetPage: { lifecycle: PageLifecycle.ACTIVE },
        targetPageId,
      },
    });
    const items = rows.map((row) => row.sourcePage);
    return { count: items.length, items };
  }

  private async deleteStaleLinks(
    transaction: Prisma.TransactionClient,
    sourcePageId: string,
    targetPageIds: readonly string[],
  ): Promise<void> {
    const where: Prisma.PageLinkWhereInput =
      targetPageIds.length === 0 ? { sourcePageId } : { sourcePageId, targetPageId: { notIn: [...targetPageIds] } };
    await transaction.pageLink.deleteMany({ where });
  }

  private async insertMissingLinks(
    transaction: Prisma.TransactionClient,
    sourcePageId: string,
    targetPageIds: readonly string[],
  ): Promise<void> {
    if (targetPageIds.length === 0) return;
    await transaction.pageLink.createMany({
      data: targetPageIds.map((targetPageId) => ({ sourcePageId, targetPageId })),
      skipDuplicates: true,
    });
  }
}
