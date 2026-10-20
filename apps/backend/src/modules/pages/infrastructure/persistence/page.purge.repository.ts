import { Injectable } from '@nestjs/common';
import { type NeumaTransaction, PageLifecycle } from '@neuma/db';
import { BLOCK_TYPE } from '@neuma/shared';
import { readBlockTitle } from '../../../../common/domain/block-access.domain';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../../prisma/prisma.sql.lib';
import { PAGE_PURGE_LOCK_KEY, PAGE_TREE_MAX_DEPTH } from '../../constants/pages.constants';
import type { PageDueForPurge } from '../../types/page.block.types';
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
    const scheduled = await transaction.orm.public.Block.select('id', 'properties', 'spaceId')
      .where({ lifecycle: PageLifecycle.TRASHED, type: BLOCK_TYPE.page })
      .where((block) => block.id.in([...request.pageIds]))
      .where((block) => block.purgeAfter.isNull())
      .updateAll({ purgeAfter: request.purgeAfter });
    if (scheduled.length > 0) {
      await transaction.orm.public.PagePurge.createAll(
        scheduled.map((page) => ({
          pageId: page.id,
          purgeAfter: request.purgeAfter,
          requestedById: request.requestedById,
          spaceId: page.spaceId,
          title: readBlockTitle(page.properties),
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

  /**
   * Deletes up to `limit` pages whose deadline passed, and with each one everything below it: the rows go with the
   * page block, and so do the versions, favorites and grants that point at them. Closes the records of every page
   * that went and returns their ids, the pages below included, so their attachments can be removed.
   */
  async purgeDue(now: Date, limit: number): Promise<readonly string[]> {
    return this.prisma.transaction(async (transaction) => {
      await transaction.execute(
        this.prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${PAGE_PURGE_LOCK_KEY}))::text`.affectedCount().build(),
      );
      const due = await transaction.orm.public.Block.select('id', 'parentId', 'spaceId')
        .where({ lifecycle: PageLifecycle.TRASHED, type: BLOCK_TYPE.page })
        .where((block) => block.purgeAfter.lte(now))
        .orderBy((block) => block.purgeAfter.asc())
        .limit(limit)
        .all();
      if (due.length === 0) return [];
      const belowByRoot = await this.listPagesBelow(
        transaction,
        due.map((page) => page.id),
      );
      const deleted = await transaction.orm.public.Block.select('id')
        .where({ lifecycle: PageLifecycle.TRASHED })
        .where((block) => block.id.in(due.map((page) => page.id)))
        .where((block) => block.purgeAfter.lte(now))
        .deleteAll();
      const deletedIds = new Set(deleted.map((page) => page.id));
      await this.unlistFromParents(
        transaction,
        due.filter((page) => deletedIds.has(page.id)),
      );
      const purgedIds = [
        ...new Set([...deletedIds, ...[...deletedIds].flatMap((rootId) => belowByRoot.get(rootId) ?? [])]),
      ];
      if (purgedIds.length > 0) {
        await transaction.orm.public.PagePurge.where((purge) => purge.pageId.in(purgedIds))
          .where((purge) => purge.purgedAt.isNull())
          .where((purge) => purge.cancelledAt.isNull())
          .updateAndCount({ purgedAt: now });
      }
      return purgedIds;
    });
  }

  /** The pages below each root, found before the root goes, because the delete takes them with it. */
  private async listPagesBelow(
    transaction: NeumaTransaction,
    rootIds: readonly string[],
  ): Promise<ReadonlyMap<string, readonly string[]>> {
    const { columns } = this.prisma.tables.Block;
    const rows = await transaction.query(
      this.prisma.sql`
      WITH RECURSIVE "branch" AS (
        SELECT "id" AS "rootId", "id", "type", 0 AS "depth" FROM "Block" WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, rootIds)})
        UNION ALL
        SELECT "branch"."rootId", "child"."id", "child"."type", "branch"."depth" + 1
        FROM "Block" AS "child"
        INNER JOIN "branch" ON "child"."parentId" = "branch"."id"
        WHERE "branch"."depth" < ${PAGE_TREE_MAX_DEPTH}
      )
      SELECT "rootId", "id" FROM "branch" WHERE "type" = ${BLOCK_TYPE.page} AND "depth" > 0
    `
        .returnsRow({ id: columns.id, rootId: columns.id })
        .build(),
    );
    const belowByRoot = new Map<string, string[]>();
    for (const row of rows) belowByRoot.set(row.rootId, [...(belowByRoot.get(row.rootId) ?? []), row.id]);
    return belowByRoot;
  }

  /** The parent of a page that is gone stops listing it, so the list holds no id of a block that no longer exists. */
  private async unlistFromParents(transaction: NeumaTransaction, pages: readonly PageDueForPurge[]): Promise<void> {
    for (const page of pages) {
      const unlisting =
        page.parentId === null
          ? this.prisma.sql`
        UPDATE "Space" SET "rootPageIds" = array_remove("rootPageIds", ${page.id}) WHERE "id" = ${page.spaceId}
      `
          : this.prisma.sql`
        UPDATE "Block" SET "children" = array_remove("children", ${page.id}), "version" = "version" + 1
        WHERE "id" = ${page.parentId}
      `;
      await transaction.execute(unlisting.affectedCount().build());
    }
  }
}
