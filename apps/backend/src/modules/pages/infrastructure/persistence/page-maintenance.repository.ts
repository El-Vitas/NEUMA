import { Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PageMaintenanceRepositoryContract, PageMaintenanceRow } from '../../types/page-maintenance.types';

/** Walks every active page of a workspace regardless of who can see it. */
@Injectable()
export class PageMaintenanceRepository implements PageMaintenanceRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async listActivePages(
    workspaceId: string,
    afterPageId: string | null,
    take: number,
  ): Promise<readonly PageMaintenanceRow[]> {
    const pages = this.prisma.models.Page.select('content', 'id')
      .where({ lifecycle: PageLifecycle.ACTIVE })
      .where((page) => page.space.some({ workspaceId }));
    const pagesAfterCursor = afterPageId === null ? pages : pages.where((page) => page.id.gt(afterPageId));
    return pagesAfterCursor
      .orderBy((page) => page.id.asc())
      .limit(take)
      .all();
  }

  /** The key includes the run id: a new run notifies again, a repeat within one run does not. */
  async announceReindex(pageIds: readonly string[], runId: string): Promise<void> {
    await this.prisma.transaction(async (transaction) => {
      for (const pageId of pageIds)
        await this.outboxRepository.create(
          {
            aggregateId: pageId,
            aggregateType: 'PAGE',
            eventType: 'PAGE_UPDATED',
            idempotencyKey: `page:${pageId}:reindex:${runId}`,
            payload: { pageId },
            payloadVersion: 1,
          },
          transaction,
        );
    });
  }
}
