import { FileAssetLifecycle, type NeumaTransaction } from '@neuma/db';
import { BLOCK_TYPE } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { toSchemaPropertyDefinition } from '../../../../common/infrastructure/persistence/schema-json.adapter';
import { requireRow } from '../../../../common/utils/required-row.utils';
import type { PrismaService } from '../../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../../prisma/prisma.sql.lib';
import {
  BLOCK_NOTIFY_CHANNEL,
  BLOCK_RECORD_COLUMNS,
  BLOCK_TREE_LOCK_PREFIX,
} from '../../constants/block.transaction.constants';
import { BLOCK_TREE_MAX_DEPTH } from '../../constants/blocks.constants';
import type { StoredFile } from '../../domain/block.row-values.domain.types';
import type {
  BlockLinkDiff,
  BlockLoad,
  BlockPageColumns,
  BlockWrite,
  CollectionFacts,
  LinkSourceRebind,
  SpaceRoots,
  StoredBlockLink,
  StoredView,
  ViewWrite,
  WorkingBlock,
} from '../../domain/block.transaction.domain.types';
import { blockFieldSchemas, blockStoredResultSchema } from '../../schemas/block.operation.schemas';
import {
  blockChildrenSchema,
  blockJsonValueSchema,
  blockLinkKindSchema,
  viewConfigurationSchema,
  viewTypeSchema,
} from '../../schemas/block.row.schemas';
import type {
  BlockTransactionClaim,
  BlockTransactionResult,
  BlockTransactionSession,
} from '../../types/block.transaction.types';
import { toCollectionFacts } from './block.collection-facts.lib';
import { toRecord } from './block.repository';

/** Only the page columns the block carries: a block read without them must not erase what is stored. */
const toPageColumnChanges = (block: WorkingBlock): Partial<BlockPageColumns> => block.page ?? {};

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

  async readCollectionFacts(collectionIds: readonly string[]): Promise<CollectionFacts> {
    if (collectionIds.length === 0) return { relations: new Map(), rules: new Map() };
    const properties = await this.transaction.orm.public.PageSchemaProperty.select(
      'config',
      'key',
      'options',
      'pageId',
      'type',
    )
      .where((property) => property.pageId.in([...collectionIds]))
      .orderBy((property) => property.order.asc())
      .all();
    return toCollectionFacts(properties);
  }

  /** The counter row is locked by the update until this transaction ends, so two rows never get the same number. */
  async takeUniqueIds(collectionId: string, key: string, count: number): Promise<number> {
    const { columns } = this.prisma.tables.PageSchemaProperty;
    const rows = await this.transaction.query(
      this.prisma.sql`
      UPDATE "PageSchemaProperty" SET "nextValue" = "nextValue" + ${count}
      WHERE "pageId" = ${collectionId} AND "key" = ${key}
      RETURNING "nextValue" - ${count} AS "firstValue"
    `
        .returnsRow({ firstValue: columns.nextValue })
        .build(),
    );
    return requireRow(rows[0] ?? null, `Unique id counter ${collectionId}/${key}`).firstValue;
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
  async loadBlocks(blockIds: readonly string[], spaceIds: readonly string[]): Promise<BlockLoad> {
    const spaces = await this.lockSpaces(spaceIds);
    const lockedIds = await this.lockRows(blockIds);
    const ancestors = await this.readAncestorIds(lockedIds);
    const contextIds = ancestors.ids.filter((id) => !lockedIds.includes(id));
    const locked = await this.readLocked(lockedIds);
    const context = await this.readContext(contextIds);
    return { context, isDepthExceeded: ancestors.isDepthExceeded, locked, spaces };
  }

  async readViewPageIds(viewIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (viewIds.length === 0) return new Map();
    const views = await this.transaction.orm.public.PageSchemaView.select('id', 'pageId')
      .where((view) => view.id.in([...viewIds]))
      .all();
    return new Map(views.map((view) => [view.id, view.pageId]));
  }

  async lockViews(viewIds: readonly string[]): Promise<StoredView[]> {
    if (viewIds.length === 0) return [];
    const { columns } = this.prisma.tables.PageSchemaView;
    const rows = await this.transaction.query(
      this.prisma.sql`
      SELECT "id", "pageId", "name", "type"::text AS "type", "configuration", to_jsonb("manualOrder") AS "manualOrder",
        "version"
      FROM "PageSchemaView"
      WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, viewIds)}) ORDER BY "id" FOR UPDATE
    `
        .returnsRow({
          configuration: columns.configuration,
          id: columns.id,
          manualOrder: { codecId: 'pg/jsonb@1', nullable: true },
          name: columns.name,
          pageId: columns.pageId,
          type: 'pg/text@1',
          version: columns.version,
        })
        .build(),
    );
    const orders = await this.readCollectionRowOrders([...new Set(rows.map((row) => row.pageId))]);
    return rows.map((row) => ({
      collectionOrder: orders.get(row.pageId) ?? [],
      configuration: viewConfigurationSchema.parse(row.configuration),
      id: row.id,
      manualOrder: row.manualOrder === null ? null : blockChildrenSchema.parse(row.manualOrder),
      name: row.name,
      pageId: row.pageId,
      type: viewTypeSchema.parse(row.type),
      version: row.version,
    }));
  }

  /** The children of each collection that are pages, in the order the collection lists them. */
  private async readCollectionRowOrders(collectionIds: readonly string[]): Promise<Map<string, string[]>> {
    if (collectionIds.length === 0) return new Map();
    const orders = new Map<string, string[]>(collectionIds.map((id) => [id, []]));
    const { columns } = this.prisma.tables.Block;
    const rows = await this.transaction.query(
      this.prisma.sql`
      SELECT "collection"."id" AS "collectionId", "entry"."id" AS "id"
      FROM "Block" AS "collection"
      CROSS JOIN LATERAL unnest("collection"."children") WITH ORDINALITY AS "entry"("id", "position")
      INNER JOIN "Block" AS "child" ON "child"."id" = "entry"."id" AND "child"."type" = ${BLOCK_TYPE.page}
      WHERE "collection"."id" = ANY(${buildSqlTextList(this.prisma.sql, collectionIds)})
      ORDER BY "collection"."id", "entry"."position"
    `
        .returnsRow({ collectionId: columns.id, id: columns.id })
        .build(),
    );
    for (const row of rows) orders.get(row.collectionId)?.push(row.id);
    return orders;
  }

  async listWorkspaceMemberIds(workspaceId: string): Promise<ReadonlySet<string>> {
    const members = await this.transaction.orm.public.WorkspaceMember.select('userId')
      .where({ workspaceId })
      .where((member) => member.user.some({ isActive: true }))
      .all();
    return new Set(members.map((member) => member.userId));
  }

  async readActiveFiles(fileIds: readonly string[], workspaceId: string): Promise<StoredFile[]> {
    if (fileIds.length === 0) return [];
    const assets = await this.transaction.orm.public.FileAsset.select('id', 'ownerId', 'pageId')
      .where({ lifecycle: FileAssetLifecycle.ACTIVE, workspaceId })
      .where((asset) => asset.id.in([...fileIds]))
      .all();
    return assets.map((asset) => ({ id: asset.id, ownerId: asset.ownerId, pageId: asset.pageId }));
  }

  /** A file that belongs to no page yet follows the row that names it, as it does when the page is saved by the API. */
  async attachFilesToRows(filesByRow: ReadonlyMap<string, readonly string[]>): Promise<void> {
    for (const [rowId, fileIds] of filesByRow) {
      await this.transaction.orm.public.FileAsset.where((asset) => asset.id.in([...fileIds]))
        .where({ pageId: null })
        .updateAndCount({ pageId: rowId });
    }
  }

  async readCollectionSchemas(
    pageIds: readonly string[],
  ): Promise<ReadonlyMap<string, readonly SchemaPropertyDefinition[]>> {
    if (pageIds.length === 0) return new Map();
    const schemas = new Map<string, SchemaPropertyDefinition[]>(pageIds.map((pageId) => [pageId, []]));
    const properties = await this.transaction.orm.public.PageSchemaProperty.select(
      'config',
      'key',
      'label',
      'options',
      'pageId',
      'required',
      'type',
    )
      .where((property) => property.pageId.in([...pageIds]))
      .orderBy((property) => property.order.asc())
      .all();
    for (const property of properties) schemas.get(property.pageId)?.push(toSchemaPropertyDefinition(property));
    return schemas;
  }

  async writeViews(writes: readonly ViewWrite[]): Promise<void> {
    for (const write of writes) {
      const updated = await this.transaction.orm.public.PageSchemaView.where({ id: write.id }).update({
        configuration: blockFieldSchemas.properties.parse(write.configuration),
        manualOrder: write.manualOrder === null ? null : [...write.manualOrder],
        version: write.version,
      });
      requireRow(updated, `View ${write.id}`);
    }
  }

  async appendRowsToViewOrders(rows: readonly { readonly pageId: string; readonly rowId: string }[]): Promise<void> {
    for (const { pageId, rowId } of rows) {
      await this.transaction.execute(
        this.prisma.sql`
        UPDATE "PageSchemaView"
        SET "manualOrder" = array_append("manualOrder", ${rowId}::text), "version" = "version" + 1
        WHERE "pageId" = ${pageId} AND "manualOrder" IS NOT NULL AND NOT (${rowId}::text = ANY("manualOrder"))
      `
          .affectedCount()
          .build(),
      );
    }
  }

  async writeSpaces(spaces: readonly SpaceRoots[]): Promise<void> {
    for (const space of spaces) {
      const updated = await this.transaction.orm.public.Space.where({ id: space.id }).update({
        rootPageIds: [...space.rootPageIds],
      });
      requireRow(updated, `Space ${space.id}`);
    }
  }

  /**
   * Holds each space in id order, without keeping other writers from adding blocks to it, and reads its list of
   * top-level pages. Only the spaces whose lists the transaction may change are named.
   */
  private async lockSpaces(spaceIds: readonly string[]): Promise<SpaceRoots[]> {
    if (spaceIds.length === 0) return [];
    const { columns } = this.prisma.tables.Space;
    const rows = await this.transaction.query(
      this.prisma.sql`
      SELECT "id", to_jsonb("rootPageIds") AS "rootPageIds" FROM "Space"
      WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, spaceIds)}) ORDER BY "id" FOR NO KEY UPDATE
    `
        .returnsRow({ id: columns.id, rootPageIds: 'pg/jsonb@1' })
        .build(),
    );
    return rows.map((row) => ({ id: row.id, rootPageIds: blockChildrenSchema.parse(row.rootPageIds) }));
  }

  /** Every row below the roots, dead ones included, because a branch that changes space takes all of it along. */
  async listDescendantIds(rootIds: readonly string[]): Promise<string[]> {
    if (rootIds.length === 0) return [];
    const { columns } = this.prisma.tables.Block;
    const rows = await this.transaction.query(
      this.prisma.sql`
      WITH RECURSIVE "descendant" AS (
        SELECT "id", 1 AS "depth" FROM "Block" WHERE "parentId" = ANY(${buildSqlTextList(this.prisma.sql, rootIds)})
        UNION ALL
        SELECT "child"."id", "descendant"."depth" + 1
        FROM "Block" AS "child"
        INNER JOIN "descendant" ON "child"."parentId" = "descendant"."id"
        WHERE "descendant"."depth" < ${BLOCK_TREE_MAX_DEPTH}
      )
      SELECT DISTINCT "id" FROM "descendant"
    `
        .returnsRow({ id: columns.id })
        .build(),
    );
    return rows.map((row) => row.id);
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
          SELECT "id", 1 AS "depth" FROM "Block" WHERE "parentId" = ${rootBlockId} AND "type" <> ${BLOCK_TYPE.page}
          UNION ALL
          SELECT "child"."id", "descendant"."depth" + 1
          FROM "Block" AS "child"
          INNER JOIN "descendant" ON "child"."parentId" = "descendant"."id"
          WHERE "child"."type" <> ${BLOCK_TYPE.page} AND "descendant"."depth" < ${BLOCK_TREE_MAX_DEPTH}
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
      page: {
        lockedById: row.lockedById,
        ownerId: row.ownerId,
        purgeAfter: row.purgeAfter,
        trashedAt: row.trashedAt,
        verificationExpiresAt: row.verificationExpiresAt,
        verifiedAt: row.verifiedAt,
        verifiedById: row.verifiedById,
      },
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
        ...toPageColumnChanges(block),
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
      lifecycle: block.lifecycle,
      lockedAt: block.lockedAt,
      parentId: block.parentId,
      permissions: blockJsonValueSchema.parse(block.permissions),
      properties: blockJsonValueSchema.parse(block.properties),
      spaceId: block.spaceId,
      text: block.text,
      textState: block.textState === null ? null : Buffer.from(block.textState),
      type: block.type,
      version: block.version,
      ...toPageColumnChanges(block),
    });
    requireRow(updated, `Block ${block.id}`);
  }
}
