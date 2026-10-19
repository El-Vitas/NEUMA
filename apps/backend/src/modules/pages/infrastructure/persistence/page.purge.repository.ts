import { Injectable } from '@nestjs/common';
import { type NeumaTransaction, PageLifecycle } from '@neuma/db';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PAGE_PURGE_LOCK_KEY } from '../../constants/pages.constants';
import type { PagePurgeRequest } from '../../types/page.types';

@Injectable()
export class PagePurgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Marks trashed pages for deletion and writes who asked. Only pages still trashed and not already scheduled
   * are taken, re-checked in the same statement, so a concurrent restore wins. Returns the pages scheduled.
   */
  async schedule(transaction: NeumaTransaction, request: PagePurgeRequest): Promise<readonly string[]> {
    if (request.pageIds.length === 0) return [];
    const scheduled = await transaction.orm.public.Page.select('id', 'spaceId', 'title')
      .where({ lifecycle: PageLifecycle.TRASHED })
      .where((page) => page.id.in([...request.pageIds]))
      .where((page) => page.purgeAfter.isNull())
      .updateAll({ purgeAfter: request.purgeAfter });
    if (scheduled.length > 0) {
      await transaction.orm.public.PagePurge.createAll(
        scheduled.map((page) => ({
          pageId: page.id,
          purgeAfter: request.purgeAfter,
          requestedById: request.requestedById,
          spaceId: page.spaceId,
          title: page.title,
          workspaceId: request.workspaceId,
        })),
      );
    }
    return scheduled.map((page) => page.id);
  }

  /** A restored page keeps living, so its pending purge is closed as cancelled, never deleted. */
  async cancel(transaction: NeumaTransaction, pageIds: readonly string[], cancelledAt: Date): Promise<void> {
    if (pageIds.length === 0) return;
    await transaction.orm.public.PagePurge.where((purge) => purge.pageId.in([...pageIds]))
      .where((purge) => purge.purgedAt.isNull())
      .where((purge) => purge.cancelledAt.isNull())
      .updateAndCount({ cancelledAt });
  }

  /** Deletes up to `limit` pages whose deadline passed and closes their records; returns the deleted ids. */
  async purgeDue(now: Date, limit: number): Promise<readonly string[]> {
    return this.prisma.transaction(async (transaction) => {
      await transaction.execute(
        this.prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${PAGE_PURGE_LOCK_KEY}))::text`.affectedCount().build(),
      );
      const due = await transaction.orm.public.Page.select('id')
        .where({ lifecycle: PageLifecycle.TRASHED })
        .where((page) => page.purgeAfter.lte(now))
        .orderBy((page) => page.purgeAfter.asc())
        .limit(limit)
        .all();
      if (due.length === 0) return [];
      const deleted = await transaction.orm.public.Page.select('id')
        .where({ lifecycle: PageLifecycle.TRASHED })
        .where((page) => page.id.in(due.map((row) => row.id)))
        .where((page) => page.purgeAfter.lte(now))
        .deleteAll();
      const deletedIds = deleted.map((page) => page.id);
      if (deletedIds.length > 0) {
        await transaction.orm.public.PagePurge.where((purge) => purge.pageId.in(deletedIds))
          .where((purge) => purge.purgedAt.isNull())
          .where((purge) => purge.cancelledAt.isNull())
          .updateAndCount({ purgedAt: now });
      }
      return deletedIds;
    });
  }
}
