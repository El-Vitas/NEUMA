import { PageLifecycle } from '@company-brain/db';
import { Injectable } from '@nestjs/common';
import { OutboxRepository } from '../../../../common/infrastructure/persistence/outbox.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PageMaintenanceRepositoryContract, PageMaintenanceRow } from '../../types/page-maintenance.types';

/** Recorrer todas las páginas de un espacio de trabajo para mantenerlas, sin mirar quién las ve. */
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

  /**
   * Un aviso por página, como los que deja cualquier cambio. La clave lleva la
   * corrida, así correr el mantenimiento otra vez vuelve a avisar, y un mismo
   * aviso no se duplica dentro de una corrida.
   */
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
