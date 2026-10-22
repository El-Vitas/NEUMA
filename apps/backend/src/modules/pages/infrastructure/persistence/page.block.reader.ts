import { Injectable } from '@nestjs/common';
import { and, type NeumaTransaction, PageLifecycle } from '@neuma/db';
import { BLOCK_TYPE, blockPermissionsSchema, isPageTemplate } from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../../prisma/prisma.sql.lib';
import { PAGE_BLOCK_COLUMNS, PAGE_TREE_MAX_DEPTH } from '../../constants/pages.constants';
import { canReadPage, describePageAccess } from '../../domain/page.access.domain';
import type { PageAncestryLink } from '../../domain/page.access.domain.types';
import type { PageContentBlock, ReadableContentBlocks } from '../../domain/page.block.domain.types';
import { listReadableContentBlocks } from '../../domain/page.visibility.domain';
import { pageChildrenSchema } from '../../schemas/page.block.schemas';
import type {
  AccessiblePage,
  PageBlockRow,
  PageHead,
  PageListingOptions,
  PageViewer,
  RecentlyEditedPage,
} from '../../types/page.block.types';
import type { StoredPageBlock } from '../../types/page.types';

const toStoredPageBlock = (row: PageBlockRow): StoredPageBlock => ({
  ...row,
  children: pageChildrenSchema.parse(row.children),
  permissions: blockPermissionsSchema.parse(row.permissions),
});

const keepListed = (rows: readonly PageBlockRow[], { includeTemplates = false }: PageListingOptions): PageBlockRow[] =>
  includeTemplates ? [...rows] : rows.filter((row) => !isPageTemplate(row.properties));

/** Reads page blocks and what a read of them needs: their content, the chain above them and who may see them. */
@Injectable()
export class PageBlockReader {
  constructor(private readonly prisma: PrismaService) {}

  async readPageBlocks(pageIds: readonly string[]): Promise<StoredPageBlock[]> {
    if (pageIds.length === 0) return [];
    const rows = await this.prisma.models.Block.select(...PAGE_BLOCK_COLUMNS)
      .where({ type: BLOCK_TYPE.page })
      .where((block) => block.id.in([...pageIds]))
      .all();
    return rows.map(toStoredPageBlock);
  }

  /** Templates are pages of the collection that are not part of any listing (ADR 027): ask for them to carry them. */
  async readSpacePageBlocks(spaceId: string, options: PageListingOptions = {}): Promise<StoredPageBlock[]> {
    const rows = await this.prisma.models.Block.select(...PAGE_BLOCK_COLUMNS)
      .where({ spaceId, type: BLOCK_TYPE.page })
      .all();
    return keepListed(rows, options).map(toStoredPageBlock);
  }

  /** The pages that sit directly under any of the pages named. */
  async readPagesUnder(parentIds: readonly string[], options: PageListingOptions = {}): Promise<StoredPageBlock[]> {
    if (parentIds.length === 0) return [];
    const rows = await this.prisma.models.Block.select(...PAGE_BLOCK_COLUMNS)
      .where({ type: BLOCK_TYPE.page })
      .where((block) => block.parentId.in([...parentIds]))
      .all();
    return keepListed(rows, options).map(toStoredPageBlock);
  }

  /** The pages a space holds at its top, or the ones a page holds: the sibling order is the caller's to apply. */
  async readChildPageBlocks(spaceId: string, parentId: null | string): Promise<StoredPageBlock[]> {
    const rows = await this.prisma.models.Block.select(...PAGE_BLOCK_COLUMNS)
      .where({ parentId, spaceId, type: BLOCK_TYPE.page })
      .all();
    return keepListed(rows, {}).map(toStoredPageBlock);
  }

  /** Just enough of the pages under each parent to tell whether the reader can open one: no content, no children. */
  async readChildPageHeads(parentIds: readonly string[]): Promise<PageHead[]> {
    if (parentIds.length === 0) return [];
    const rows = await this.prisma.models.Block.select('id', 'lifecycle', 'parentId', 'permissions', 'properties')
      .where({ type: BLOCK_TYPE.page })
      .where((block) => block.parentId.in([...parentIds]))
      .all();
    return rows.filter((row) => !isPageTemplate(row.properties));
  }

  /**
   * Which of the parents have a page under them that the reader can open, without reading the children: the ones
   * that follow their parent's rule need no check once one of them is known, and only the ones that declare their
   * own are judged. `isListed` narrows the children, for a token that only reaches some pages.
   */
  async findParentsWithReadableChildren(
    parentIds: readonly string[],
    viewer: PageViewer,
    isListed: (pageId: string) => boolean = () => true,
  ): Promise<ReadonlySet<string>> {
    const heads = (await this.readChildPageHeads(parentIds)).filter(
      (head) => head.lifecycle === PageLifecycle.ACTIVE && head.parentId !== null && isListed(head.id),
    );
    const parents = new Set(heads.filter((head) => head.permissions === null).map((head) => head.parentId ?? ''));
    const declaring = heads.filter((head) => head.permissions !== null && !parents.has(head.parentId ?? ''));
    const accessible = await this.keepAccessible(await this.readPageBlocks(declaring.map((head) => head.id)), viewer);
    for (const page of accessible) {
      if (!page.access.isInTrash && page.block.parentId !== null) parents.add(page.block.parentId);
    }
    return parents;
  }

  /**
   * The pages whose blocks, or the blocks below them, changed last in a space, the latest first. It reads the most
   * recently edited blocks and goes up from each to the page that holds it.
   */
  async readRecentlyEditedPages(spaceId: string, blockLimit: number): Promise<RecentlyEditedPage[]> {
    const { columns } = this.prisma.tables.Block;
    return this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "recent" AS (
        SELECT "id", "parentId", "type", "editedAt", "editedById" FROM "Block"
        WHERE "spaceId" = ${spaceId} ORDER BY "editedAt" DESC LIMIT ${blockLimit}
      ), "above" AS (
        SELECT "id", "parentId", "type", "editedAt", "editedById", 0 AS "depth" FROM "recent"
        UNION ALL
        SELECT "parent"."id", "parent"."parentId", "parent"."type", "above"."editedAt", "above"."editedById",
          "above"."depth" + 1
        FROM "Block" AS "parent"
        INNER JOIN "above" ON "parent"."id" = "above"."parentId"
        WHERE "above"."type" <> ${BLOCK_TYPE.page} AND "above"."depth" < ${PAGE_TREE_MAX_DEPTH}
      )
      SELECT "id", max("editedAt") AS "editedAt", (array_agg("editedById" ORDER BY "editedAt" DESC))[1] AS "editedById"
      FROM "above"
      WHERE "type" = ${BLOCK_TYPE.page}
      GROUP BY "id" ORDER BY max("editedAt") DESC
    `
        .returnsRow({ editedAt: columns.editedAt, editedById: columns.editedById, id: columns.id })
        .build(),
    );
  }

  /** The pages in the trash of these spaces, templates included; the pages that went along with one are not read. */
  async readTrashedPageBlocks(spaceIds: readonly string[]): Promise<StoredPageBlock[]> {
    if (spaceIds.length === 0) return [];
    const rows = await this.prisma.models.Block.select(...PAGE_BLOCK_COLUMNS)
      .where({ lifecycle: PageLifecycle.TRASHED, type: BLOCK_TYPE.page })
      .where((block) => block.spaceId.in([...spaceIds]))
      .all();
    return rows.map(toStoredPageBlock);
  }

  /** How many pages below each one are in the trash on their own, at any depth. */
  async countTrashedDescendants(pageIds: readonly string[]): Promise<ReadonlyMap<string, number>> {
    const counts = new Map<string, number>();
    if (pageIds.length === 0) return counts;
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "below" AS (
        SELECT "id" AS "rootId", "id", 0 AS "depth" FROM "Block" WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, pageIds)})
        UNION ALL
        SELECT "below"."rootId", "child"."id", "below"."depth" + 1
        FROM "Block" AS "child"
        INNER JOIN "below" ON "child"."parentId" = "below"."id"
        WHERE "child"."type" = ${BLOCK_TYPE.page} AND "below"."depth" < ${PAGE_TREE_MAX_DEPTH}
      )
      SELECT "below"."rootId" AS "pageId", count(*)::int AS "trashedCount"
      FROM "below"
      INNER JOIN "Block" AS "block" ON "block"."id" = "below"."id"
      WHERE "below"."depth" > 0 AND "block"."lifecycle"::text = ${PageLifecycle.TRASHED}
      GROUP BY "below"."rootId"
    `
        .returnsRow({ pageId: columns.id, trashedCount: columns.version })
        .build(),
    );
    for (const row of rows) counts.set(row.pageId, row.trashedCount);
    return counts;
  }

  /** The templates of a collection, in the order they were made. */
  async readTemplatesUnder(collectionId: string): Promise<StoredPageBlock[]> {
    const rows = await this.prisma.models.Block.select(...PAGE_BLOCK_COLUMNS)
      .where({ parentId: collectionId, type: BLOCK_TYPE.page })
      .all();
    return rows
      .filter((row) => isPageTemplate(row.properties))
      .toSorted((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
      .map(toStoredPageBlock);
  }

  /**
   * What each page holds that its viewer may read, from one statement for all of them. A block closed to the viewer
   * is left out with its branch, the same cut a sync makes, and its id is returned to be cut from other copies.
   */
  async readVisibleContentBlocks(
    pages: readonly AccessiblePage[],
    transaction?: NeumaTransaction,
  ): Promise<ReadonlyMap<string, ReadableContentBlocks>> {
    const contents = await this.readContentBlocks(
      pages.map(({ block }) => block.id),
      transaction,
    );
    return new Map(
      pages.map(({ access, block, viewer }) => [
        block.id,
        listReadableContentBlocks(block, access.declared, contents.get(block.id) ?? [], viewer),
      ]),
    );
  }

  /** Holds the page block against other writers until the transaction ends. */
  async lockPageBlock(pageId: string, transaction: NeumaTransaction): Promise<StoredPageBlock | null> {
    const row = await transaction.orm.public.Block.select(...PAGE_BLOCK_COLUMNS)
      .where({ id: pageId, type: BLOCK_TYPE.page })
      .forUpdate()
      .first();
    return row === null ? null : toStoredPageBlock(row);
  }

  /** Everything below each page except the pages it holds, from one statement for all of them. */
  async readContentBlocks(
    pageIds: readonly string[],
    transaction?: NeumaTransaction,
  ): Promise<ReadonlyMap<string, readonly PageContentBlock[]>> {
    const contents = new Map<string, PageContentBlock[]>(pageIds.map((pageId) => [pageId, []]));
    if (pageIds.length === 0) return contents;
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runnerFor(transaction).query(
      this.prisma.sql`
      WITH RECURSIVE "owned" AS (
        SELECT "id" AS "pageId", "id", 0 AS "depth" FROM "Block" WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, pageIds)})
        UNION ALL
        SELECT "owned"."pageId", "child"."id", "owned"."depth" + 1
        FROM "Block" AS "child"
        INNER JOIN "owned" ON "child"."parentId" = "owned"."id"
        WHERE "child"."alive" AND "child"."type" <> ${BLOCK_TYPE.page} AND "owned"."depth" < ${PAGE_TREE_MAX_DEPTH}
      )
      SELECT "owned"."pageId", "block"."id", "block"."parentId", "block"."type",
        to_jsonb("block"."children") AS "children", "block"."properties", "block"."format",
        "block"."editedAt", "block"."editedById", "block"."permissions"
      FROM "owned"
      INNER JOIN "Block" AS "block" ON "block"."id" = "owned"."id"
      WHERE "owned"."depth" > 0
    `
        .returnsRow({
          children: 'pg/jsonb@1',
          editedAt: columns.editedAt,
          editedById: columns.editedById,
          format: columns.format,
          id: columns.id,
          pageId: columns.id,
          parentId: columns.parentId,
          permissions: columns.permissions,
          properties: columns.properties,
          type: columns.type,
        })
        .build(),
    );
    for (const { pageId, ...row } of rows) {
      contents.get(pageId)?.push({
        ...row,
        children: pageChildrenSchema.parse(row.children),
        permissions: blockPermissionsSchema.parse(row.permissions),
      });
    }
    return contents;
  }

  /** The nearest page above each block, or the block itself when it is a page. */
  async findOwningPageIds(blockIds: readonly string[]): Promise<string[]> {
    if (blockIds.length === 0) return [];
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "above" AS (
        SELECT "id", "parentId", "type", 0 AS "depth" FROM "Block" WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, blockIds)})
        UNION ALL
        SELECT "parent"."id", "parent"."parentId", "parent"."type", "above"."depth" + 1
        FROM "Block" AS "parent"
        INNER JOIN "above" ON "parent"."id" = "above"."parentId"
        WHERE "above"."type" <> ${BLOCK_TYPE.page} AND "above"."depth" < ${PAGE_TREE_MAX_DEPTH}
      )
      SELECT DISTINCT "id" FROM "above" WHERE "type" = ${BLOCK_TYPE.page}
    `
        .returnsRow({ id: columns.id })
        .build(),
    );
    return rows.map((row) => row.id);
  }

  /** The removed blocks among `blockIds` that were part of the page, which a document can bring back by id. */
  async readRemovedContentBlocks(pageId: string, blockIds: readonly string[]): Promise<PageContentBlock[]> {
    if (blockIds.length === 0) return [];
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "owned" AS (
        SELECT "id", 0 AS "depth" FROM "Block" WHERE "id" = ${pageId}
        UNION ALL
        SELECT "child"."id", "owned"."depth" + 1
        FROM "Block" AS "child"
        INNER JOIN "owned" ON "child"."parentId" = "owned"."id"
        WHERE "child"."type" <> ${BLOCK_TYPE.page} AND "owned"."depth" < ${PAGE_TREE_MAX_DEPTH}
      )
      SELECT "block"."id", "block"."parentId", "block"."type", to_jsonb("block"."children") AS "children",
        "block"."properties", "block"."format", "block"."editedAt", "block"."editedById", "block"."permissions"
      FROM "owned"
      INNER JOIN "Block" AS "block" ON "block"."id" = "owned"."id"
      WHERE "owned"."depth" > 0 AND NOT "block"."alive" AND "block"."id" = ANY(${buildSqlTextList(this.prisma.sql, blockIds)})
    `
        .returnsRow({
          children: 'pg/jsonb@1',
          editedAt: columns.editedAt,
          editedById: columns.editedById,
          format: columns.format,
          id: columns.id,
          parentId: columns.parentId,
          permissions: columns.permissions,
          properties: columns.properties,
          type: columns.type,
        })
        .build(),
    );
    return rows.map((row) => ({
      ...row,
      children: pageChildrenSchema.parse(row.children),
      permissions: blockPermissionsSchema.parse(row.permissions),
    }));
  }

  /** The chain from each page up to the top of its tree, the page itself first. */
  async readAncestry(pageIds: readonly string[]): Promise<ReadonlyMap<string, readonly PageAncestryLink[]>> {
    const chains = new Map<string, PageAncestryLink[]>(pageIds.map((pageId) => [pageId, []]));
    if (pageIds.length === 0) return chains;
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "chain" AS (
        SELECT "id" AS "startId", "id", "parentId", "lifecycle", "permissions", 0 AS "depth"
        FROM "Block" WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, pageIds)})
        UNION ALL
        SELECT "chain"."startId", "parent"."id", "parent"."parentId", "parent"."lifecycle", "parent"."permissions",
          "chain"."depth" + 1
        FROM "Block" AS "parent"
        INNER JOIN "chain" ON "parent"."id" = "chain"."parentId"
        WHERE "chain"."depth" < ${PAGE_TREE_MAX_DEPTH}
      )
      SELECT "startId", "id", "lifecycle"::text AS "lifecycle", "permissions", "depth"
      FROM "chain"
      ORDER BY "startId", "depth"
    `
        .returnsRow({
          depth: columns.version,
          id: columns.id,
          lifecycle: 'pg/text@1',
          permissions: columns.permissions,
          startId: columns.id,
        })
        .build(),
    );
    for (const row of rows) {
      chains.get(row.startId)?.push({
        id: row.id,
        lifecycle: row.lifecycle === PageLifecycle.TRASHED ? PageLifecycle.TRASHED : PageLifecycle.ACTIVE,
        permissions: blockPermissionsSchema.parse(row.permissions),
      });
    }
    return chains;
  }

  /** The spaces among `spaceIds` the viewer may read, by the visibility of the space itself. */
  async readReadableSpaceIds(spaceIds: readonly string[], viewer: PageViewer): Promise<ReadonlySet<string>> {
    if (spaceIds.length === 0) return new Set();
    const spaces = await this.prisma.models.Space.select('id')
      .where((space) => and(space.workspaceId.eq(viewer.workspaceId), space.id.in([...spaceIds])))
      .where(buildSpaceVisibilityFilter(viewer.userId, viewer.role))
      .all();
    return new Set(spaces.map((space) => space.id));
  }

  /**
   * Keeps the pages the viewer may read: the space is visible to them and the chain above the page gives them a role
   * that reads. Each keeps whether it sits in the trash, its own or by an ancestor.
   */
  async keepAccessible(blocks: readonly StoredPageBlock[], viewer: PageViewer): Promise<AccessiblePage[]> {
    if (blocks.length === 0) return [];
    const readableSpaceIds = await this.readReadableSpaceIds(
      [...new Set(blocks.map((block) => block.spaceId))],
      viewer,
    );
    const visibleBlocks = blocks.filter((block) => readableSpaceIds.has(block.spaceId));
    const chains = await this.readAncestry(visibleBlocks.map((block) => block.id));
    const blockViewer = { userId: viewer.userId, workspaceRole: viewer.role };
    return visibleBlocks
      .map((block) => ({
        access: describePageAccess(chains.get(block.id) ?? [], blockViewer, true),
        block,
        viewer: blockViewer,
      }))
      .filter(({ access }) => canReadPage(access));
  }

  async findExistingBlockIds(blockIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (blockIds.length === 0) return new Set();
    const rows = await this.prisma.models.Block.select('id')
      .where((block) => block.id.in([...blockIds]))
      .all();
    return new Set(rows.map((row) => row.id));
  }

  /** The position of each page among its siblings: its place in the list of the page that holds it. */
  async readPositions(blocks: readonly StoredPageBlock[]): Promise<ReadonlyMap<string, number>> {
    const positions = new Map<string, number>();
    const parentIds = [...new Set(blocks.flatMap((block) => (block.parentId === null ? [] : [block.parentId])))];
    const parents = parentIds.length === 0 ? [] : await this.readChildLists(parentIds);
    const childrenByParent = new Map(parents.map((parent) => [parent.id, parent.children]));
    for (const block of blocks) {
      if (block.parentId === null) continue;
      positions.set(block.id, Math.max(0, childrenByParent.get(block.parentId)?.indexOf(block.id) ?? 0));
    }
    const rootSpaceIds = [...new Set(blocks.filter((block) => block.parentId === null).map((block) => block.spaceId))];
    for (const spaceId of rootSpaceIds) {
      for (const [position, rootId] of (await this.readRootPageIds(spaceId)).entries()) positions.set(rootId, position);
    }
    return positions;
  }

  /** The top-level pages of a space, in the order the space lists them. */
  async readRootPageIds(spaceId: string): Promise<string[]> {
    const space = await this.prisma.models.Space.select('rootPageIds').where({ id: spaceId }).first();
    return space === null ? [] : pageChildrenSchema.parse(space.rootPageIds);
  }

  /** The ids of the pages that share a list with a page: the children of its parent, or the top of its space. */
  async readSiblingIds(spaceId: string, parentId: null | string): Promise<string[]> {
    if (parentId === null) return this.readRootPageIds(spaceId);
    const [parent] = await this.readPageBlocks([parentId]);
    return parent === undefined ? [] : [...parent.children];
  }

  async readUsers(userIds: readonly string[]): Promise<ReadonlyMap<string, { id: string; name: string }>> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) return new Map();
    const users = await this.prisma.models.User.select('id', 'name')
      .where((user) => user.id.in(uniqueUserIds))
      .all();
    return new Map(users.map((user) => [user.id, user]));
  }

  private async readChildLists(parentIds: readonly string[]): Promise<{ children: string[]; id: string }[]> {
    const rows = await this.prisma.models.Block.select('children', 'id')
      .where((block) => block.id.in([...parentIds]))
      .all();
    return rows.map((row) => ({ children: pageChildrenSchema.parse(row.children), id: row.id }));
  }
}
