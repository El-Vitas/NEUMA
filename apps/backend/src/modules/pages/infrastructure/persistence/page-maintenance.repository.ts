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

  listActivePages(
    workspaceId: string,
    afterPageId: string | null,
    take: number,
  ): Promise<readonly PageMaintenanceRow[]> {
    return this.prisma.page.findMany({
      orderBy: { id: 'asc' },
      select: { content: true, id: true },
      take,
      where: {
        lifecycle: PageLifecycle.ACTIVE,
        space: { workspaceId },
        ...(afterPageId === null ? {} : { id: { gt: afterPageId } }),
      },
    });
  }

  /** The key includes the run id: a new run notifies again, a repeat within one run does not. */
  async announceReindex(pageIds: readonly string[], runId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
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
