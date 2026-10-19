import type { NeumaTransaction } from '@neuma/db';
import { requireRow } from '../../../../common/utils/required-row.utils';
import type { PrismaService } from '../../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../../prisma/prisma.sql.lib';
import {
  BLOCK_NOTIFY_CHANNEL,
  BLOCK_RECORD_COLUMNS,
  BLOCK_TREE_LOCK_PREFIX,
} from '../../constants/block.transaction.constants';
import { BLOCK_PAGE_TYPE, BLOCK_TREE_MAX_DEPTH } from '../../constants/blocks.constants';
import type {
  BlockLinkDiff,
  BlockLoad,
  BlockWrite,
  LinkSourceRebind,
  StoredBlockLink,
  WorkingBlock,
} from '../../domain/block.transaction.domain.types';
import { blockStoredResultSchema } from '../../schemas/block.operation.schemas';
import { blockJsonValueSchema, blockLinkKindSchema } from '../../schemas/block.row.schemas';
import type {
  BlockTransactionClaim,
  BlockTransactionResult,
  BlockTransactionSession,
} from '../../types/block.transaction.types';
import { toRecord } from './block.repository';

/** The statements of one Postgres transaction, bound to the connection that holds its locks. */
export class PostgresBlockTransactionSession implements BlockTransactionSession {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transaction: NeumaTransaction,
  ) {}

  async claim(transactionId: string, userId: string, spaceId: string): Promise<BlockTransactionClaim> {
    const transactions = this.transaction.orm.public.BlockTransaction;
    const createdCount = await transactions.createAndCount([{ id: transactionId, result: {}, spaceId, userId }], {
      onConflict: 'skip',
    });
    if (createdCount > 0) return { kind: 'fresh' };
    const stored = requireRow(await transactions.where({ id: transactionId }).first(), `Transaction ${transactionId}`);
    if (stored.userId !== userId) return { kind: 'taken' };
    return { kind: 'replayed', result: blockStoredResultSchema.parse(stored.result) };
  }

  async lockTreeMoves(spaceId: string): Promise<void> {
    const lockKey = BLOCK_TREE_LOCK_PREFIX + spaceId;
    await this.transaction.execute(
      this.prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text`.affectedCount().build(),
    );
  }

  /**
   * Locks the named rows in id order, so two transactions that share rows never wait on each other in a circle,
   * then reads them with their text state and, apart, the ancestors their roles and lock state come from.
   */
  async loadBlocks(blockIds: readonly string[]): Promise<BlockLoad> {
    const lockedIds = await this.lockRows(blockIds);
    const ancestors = await this.readAncestorIds(lockedIds);
    const contextIds = ancestors.ids.filter((id) => !lockedIds.includes(id));
    const locked = await this.readLocked(lockedIds);
    const context = await this.readContext(contextIds);
    return { context, isDepthExceeded: ancestors.isDepthExceeded, locked };
  }

  async writeBlocks(writes: readonly BlockWrite[]): Promise<void> {
    for (const { block, isNew } of writes) {
      if (isNew) await this.createBlock(block);
      else await this.updateBlock(block);
    }
  }

  async rebindLinkSources(rebinds: readonly LinkSourceRebind[]): Promise<void> {
    for (const { rootBlockId, sourcePageId } of rebinds) {
      await this.transaction.execute(
        this.prisma.sql`
        WITH RECURSIVE "descendant" AS (
          SELECT "id", 1 AS "depth" FROM "Block" WHERE "parentId" = ${rootBlockId} AND "type" <> ${BLOCK_PAGE_TYPE}
          UNION ALL
          SELECT "child"."id", "descendant"."depth" + 1
          FROM "Block" AS "child"
          INNER JOIN "descendant" ON "child"."parentId" = "descendant"."id"
          WHERE "child"."type" <> ${BLOCK_PAGE_TYPE} AND "descendant"."depth" < ${BLOCK_TREE_MAX_DEPTH}
        )
        UPDATE "BlockLink" SET "sourcePageId" = ${sourcePageId}
        WHERE "sourceBlockId" IN (SELECT "id" FROM "descendant")
      `
          .affectedCount()
          .build(),
      );
    }
  }

  async readLinks(sourceBlockIds: readonly string[]): Promise<StoredBlockLink[]> {
    if (sourceBlockIds.length === 0) return [];
    const links = await this.transaction.orm.public.BlockLink.where((link) =>
      link.sourceBlockId.in([...sourceBlockIds]),
    ).all();
    return links.map((link) => ({
      id: link.id,
      kind: blockLinkKindSchema.parse(link.kind),
      sourceBlockId: link.sourceBlockId,
      sourcePageId: link.sourcePageId,
      targetBlockId: link.targetBlockId,
    }));
  }

  /** A target that does not exist cannot be linked to: the link is left out until a later save finds it. */
  async writeLinks(diff: BlockLinkDiff): Promise<void> {
    const links = this.transaction.orm.public.BlockLink;
    if (diff.deleteIds.length > 0) await links.where((link) => link.id.in([...diff.deleteIds])).deleteAndCount();
    const targetIds = [...new Set(diff.drafts.map((draft) => draft.targetBlockId))];
    const existing = await this.findExistingBlockIds(targetIds);
    const rows = diff.drafts.filter((draft) => existing.has(draft.targetBlockId));
    if (rows.length > 0) await links.createAndCount(rows);
  }

  async recordResult(result: BlockTransactionResult): Promise<void> {
    const updated = await this.transaction.orm.public.BlockTransaction.where({ id: result.id }).update({
      result: blockJsonValueSchema.parse(result),
    });
    requireRow(updated, `Transaction ${result.id}`);
  }

  async notify(payload: string): Promise<void> {
    await this.transaction.execute(
      this.prisma.sql`SELECT pg_notify(${BLOCK_NOTIFY_CHANNEL}, ${payload})::text`.affectedCount().build(),
    );
  }

  private async lockRows(blockIds: readonly string[]): Promise<string[]> {
    const { columns } = this.prisma.tables.Block;
    const rows = await this.transaction.query(
      this.prisma.sql`
      SELECT "id" FROM "Block" WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, blockIds)}) ORDER BY "id" FOR UPDATE
    `
        .returnsRow({ id: columns.id })
        .build(),
    );
    return rows.map((row) => row.id);
  }

  private async readAncestorIds(blockIds: readonly string[]): Promise<{ ids: string[]; isDepthExceeded: boolean }> {
    const { columns } = this.prisma.tables.Block;
    const rows = await this.transaction.query(
      this.prisma.sql`
      WITH RECURSIVE "ancestor" AS (
        SELECT "parent"."id", "parent"."parentId", 1 AS "depth"
        FROM "Block" AS "block"
        INNER JOIN "Block" AS "parent" ON "parent"."id" = "block"."parentId"
        WHERE "block"."id" = ANY(${buildSqlTextList(this.prisma.sql, blockIds)})
        UNION ALL
        SELECT "next"."id", "next"."parentId", "ancestor"."depth" + 1
        FROM "Block" AS "next"
        INNER JOIN "ancestor" ON "next"."id" = "ancestor"."parentId"
        WHERE "ancestor"."depth" < ${BLOCK_TREE_MAX_DEPTH}
      ),
      "overflow" AS (
        SELECT EXISTS (
          SELECT 1 FROM "ancestor" WHERE "depth" = ${BLOCK_TREE_MAX_DEPTH} AND "parentId" IS NOT NULL
        ) AS "exceeded"
      )
      SELECT DISTINCT "ancestor"."id", "overflow"."exceeded" AS "isDepthExceeded"
      FROM "ancestor" CROSS JOIN "overflow"
    `
        .returnsRow({ id: columns.id, isDepthExceeded: 'pg/bool@1' })
        .build(),
    );
    return { ids: rows.map((row) => row.id), isDepthExceeded: rows.some((row) => row.isDepthExceeded) };
  }

  private async readLocked(blockIds: readonly string[]): Promise<WorkingBlock[]> {
    if (blockIds.length === 0) return [];
    const rows = await this.transaction.orm.public.Block.where((block) => block.id.in([...blockIds])).all();
    return rows.map((row) => ({
      ...toRecord(row),
      textState: row.textState === null ? null : new Uint8Array(row.textState),
    }));
  }

  private async readContext(blockIds: readonly string[]): Promise<WorkingBlock[]> {
    if (blockIds.length === 0) return [];
    const rows = await this.transaction.orm.public.Block.select(...BLOCK_RECORD_COLUMNS)
      .where((block) => block.id.in([...blockIds]))
      .all();
    return rows.map((row) => ({ ...toRecord(row), textState: null }));
  }

  private async findExistingBlockIds(blockIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (blockIds.length === 0) return new Set();
    const rows = await this.transaction.orm.public.Block.select('id')
      .where((block) => block.id.in([...blockIds]))
      .all();
    return new Set(rows.map((row) => row.id));
  }

  private async createBlock(block: WorkingBlock): Promise<void> {
    await this.transaction.orm.public.Block.createAndCount([
      {
        alive: block.alive,
        children: [...block.children],
        createdById: block.createdById,
        editedById: block.editedById,
        format: blockJsonValueSchema.parse(block.format),
        id: block.id,
        parentId: block.parentId,
        permissions: blockJsonValueSchema.parse(block.permissions),
        properties: blockJsonValueSchema.parse(block.properties),
        spaceId: block.spaceId,
        text: block.text,
        textState: block.textState === null ? null : Buffer.from(block.textState),
        type: block.type,
        version: block.version,
      },
    ]);
  }

  private async updateBlock(block: WorkingBlock): Promise<void> {
    const updated = await this.transaction.orm.public.Block.where({ id: block.id }).update({
      alive: block.alive,
      children: [...block.children],
      editedAt: block.editedAt,
      editedById: block.editedById,
      format: blockJsonValueSchema.parse(block.format),
      parentId: block.parentId,
      permissions: blockJsonValueSchema.parse(block.permissions),
      properties: blockJsonValueSchema.parse(block.properties),
      text: block.text,
      textState: block.textState === null ? null : Buffer.from(block.textState),
      type: block.type,
      version: block.version,
    });
    requireRow(updated, `Block ${block.id}`);
  }
}
