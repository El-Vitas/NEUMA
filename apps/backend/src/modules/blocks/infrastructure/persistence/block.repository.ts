import { Injectable } from '@nestjs/common';
import { BLOCK_TYPE, blockPermissionsSchema } from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  BLOCK_RELATION,
  BLOCK_SUBTREE_MAX_BLOCKS,
  BLOCK_SYNC_MAX_ROWS,
  BLOCK_TREE_MAX_DEPTH,
} from '../../constants/blocks.constants';
import type { BlockRecord } from '../../domain/block.domain.types';
import { listReadableSpaceIdsByUser } from '../../domain/block.space-access.domain';
import {
  blockChildrenSchema,
  blockJsonObjectSchema,
  blockLifecycleSchema,
  blockRelationSchema,
} from '../../schemas/block.row.schemas';
import type {
  BlockReader,
  BlockReadResult,
  BlockRepositoryContract,
  BlockRow,
  RequestedBlock,
  StoredBlockRow,
} from '../../types/blocks.types';

/** Reads blocks with the textual columns only: `textState` is binary and not part of the sync reads. */
@Injectable()
export class BlockRepository implements BlockRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One statement: the page's own blocks, capped, plus the chain of ancestors the roles inherit from. A child page
   * comes back as a row but is not opened. `isDepthExceeded` flags a chain that ran past the depth limit.
   */
  async readSubtree(pageId: string): Promise<BlockReadResult> {
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "subtree" AS (
        SELECT "id", "type", 0 AS "depth" FROM "Block" WHERE "id" = ${pageId} AND "alive"
        UNION ALL
        SELECT "child"."id", "child"."type", "subtree"."depth" + 1
        FROM "Block" AS "child"
        INNER JOIN "subtree" ON "child"."parentId" = "subtree"."id"
        WHERE "child"."alive" AND "subtree"."depth" < ${BLOCK_TREE_MAX_DEPTH}
          AND ("subtree"."depth" = 0 OR "subtree"."type" <> ${BLOCK_TYPE.page})
      ),
      "limited" AS (
        SELECT "id" FROM "subtree" ORDER BY "depth" LIMIT ${BLOCK_SUBTREE_MAX_BLOCKS + 1}
      ),
      "ancestor" AS (
        SELECT "parent"."id", "parent"."parentId", 1 AS "depth"
        FROM "Block" AS "page"
        INNER JOIN "Block" AS "parent" ON "parent"."id" = "page"."parentId"
        WHERE "page"."id" = ${pageId}
        UNION ALL
        SELECT "next"."id", "next"."parentId", "ancestor"."depth" + 1
        FROM "Block" AS "next"
        INNER JOIN "ancestor" ON "next"."id" = "ancestor"."parentId"
        WHERE "ancestor"."depth" < ${BLOCK_TREE_MAX_DEPTH}
      ),
      "overflow" AS (
        SELECT (
          EXISTS (
            SELECT 1 FROM "subtree"
            INNER JOIN "Block" AS "deeper" ON "deeper"."parentId" = "subtree"."id"
            WHERE "subtree"."depth" = ${BLOCK_TREE_MAX_DEPTH} AND "deeper"."alive"
              AND "subtree"."type" <> ${BLOCK_TYPE.page}
          )
          OR EXISTS (
            SELECT 1 FROM "ancestor" WHERE "depth" = ${BLOCK_TREE_MAX_DEPTH} AND "parentId" IS NOT NULL
          )
        ) AS "exceeded"
      ),
      "member" AS (
        SELECT "id", ${BLOCK_RELATION.target}::text AS "relation" FROM "limited"
        UNION ALL
        SELECT "id", ${BLOCK_RELATION.context}::text AS "relation" FROM "ancestor"
      )
      SELECT "member"."relation", "overflow"."exceeded" AS "isDepthExceeded", "block"."id", "block"."spaceId",
        "block"."parentId", "block"."type", to_jsonb("block"."children") AS "children", "block"."properties",
        "block"."format", "block"."text", "block"."alive", "block"."lifecycle"::text AS "lifecycle",
        "block"."lockedAt", "block"."version", "block"."createdById", "block"."editedById", "block"."createdAt",
        "block"."editedAt", "block"."permissions", coalesce(octet_length("block"."textState"), 0) AS "textStateBytes"
      FROM "member"
      CROSS JOIN "overflow"
      INNER JOIN "Block" AS "block" ON "block"."id" = "member"."id"
      ORDER BY "member"."relation", "block"."id"
    `
        .returnsRow(this.describeRow())
        .build(),
    );
    return toReadResult(rows);
  }

  /**
   * One statement: the requested blocks that moved past the version the client holds are the targets. Requested
   * blocks that did not move, the ancestors of every requested block (for the roles) and the children of the
   * moved ones (for the children lists) are context, and are not returned. Duplicated ids keep the lowest version.
   */
  async readChanged(requested: readonly RequestedBlock[]): Promise<BlockReadResult> {
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "requested" AS (
        SELECT "id", MIN("version") AS "version"
        FROM jsonb_to_recordset(${JSON.stringify(requested)}::jsonb) AS "request"("id" text, "version" int)
        GROUP BY "id"
      ),
      "known" AS (
        SELECT "block"."id", "block"."parentId", ("block"."version" > "requested"."version") AS "isChanged"
        FROM "Block" AS "block"
        INNER JOIN "requested" ON "requested"."id" = "block"."id"
      ),
      "ancestor" AS (
        SELECT "parent"."id", "parent"."parentId", 1 AS "depth"
        FROM "known"
        INNER JOIN "Block" AS "parent" ON "parent"."id" = "known"."parentId"
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
      ),
      "member" AS (
        SELECT "id", ${BLOCK_RELATION.target}::text AS "relation" FROM "known" WHERE "isChanged"
        UNION
        SELECT "id", ${BLOCK_RELATION.context}::text AS "relation" FROM "known" WHERE NOT "isChanged"
        UNION
        SELECT "id", ${BLOCK_RELATION.context}::text AS "relation" FROM "ancestor"
        WHERE "id" NOT IN (SELECT "id" FROM "known")
        UNION
        SELECT "child"."id", ${BLOCK_RELATION.context}::text AS "relation"
        FROM "Block" AS "child"
        INNER JOIN "known" ON "child"."parentId" = "known"."id"
        WHERE "known"."isChanged" AND "child"."id" NOT IN (SELECT "id" FROM "known")
      )
      SELECT "member"."relation", "overflow"."exceeded" AS "isDepthExceeded", "block"."id", "block"."spaceId",
        "block"."parentId", "block"."type", to_jsonb("block"."children") AS "children", "block"."properties",
        "block"."format", "block"."text", "block"."alive", "block"."lifecycle"::text AS "lifecycle",
        "block"."lockedAt", "block"."version", "block"."createdById", "block"."editedById", "block"."createdAt",
        "block"."editedAt", "block"."permissions", coalesce(octet_length("block"."textState"), 0) AS "textStateBytes"
      FROM "member"
      CROSS JOIN "overflow"
      INNER JOIN "Block" AS "block" ON "block"."id" = "member"."id"
      ORDER BY "member"."relation", "block"."id"
      LIMIT ${BLOCK_SYNC_MAX_ROWS + 1}
    `
        .returnsRow(this.describeRow())
        .build(),
    );
    return toReadResult(rows);
  }

  async findReadableSpaceIdsByReader(
    spaceIds: readonly string[],
    readers: readonly BlockReader[],
  ): Promise<ReadonlyMap<string, ReadonlySet<string>>> {
    if (spaceIds.length === 0 || readers.length === 0) {
      return new Map(readers.map((reader) => [reader.userId, new Set<string>()]));
    }
    const spaces = await this.prisma.models.Space.select('id', 'ownerId', 'visibility', 'workspaceId')
      .where((space) => space.id.in([...spaceIds]))
      .all();
    const memberships = await this.prisma.models.SpaceMember.select('spaceId', 'userId')
      .where((member) => member.spaceId.in([...spaceIds]))
      .where((member) => member.userId.in(readers.map((reader) => reader.userId)))
      .all();
    return listReadableSpaceIdsByUser({ memberships, readers, spaces });
  }

  async readTextStates(blockIds: readonly string[]): Promise<ReadonlyMap<string, Uint8Array>> {
    if (blockIds.length === 0) return new Map();
    const rows = await this.prisma.models.Block.select('id', 'textState')
      .where((block) => block.id.in([...blockIds]))
      .all();
    return new Map(
      rows.flatMap((row) => (row.textState === null ? [] : [[row.id, new Uint8Array(row.textState)] as const])),
    );
  }

  async findReadableSpaceIds(spaceIds: readonly string[], reader: BlockReader): Promise<ReadonlySet<string>> {
    if (spaceIds.length === 0) return new Set();
    const spaces = await this.prisma.models.Space.select('id')
      .where({ workspaceId: reader.workspaceId })
      .where((space) => space.id.in([...spaceIds]))
      .where(buildSpaceVisibilityFilter(reader.userId, reader.role))
      .all();
    return new Set(spaces.map((space) => space.id));
  }

  /** The array and enum columns are read as JSON and text, then narrowed in `toRecord`. */
  private describeRow() {
    const { columns } = this.prisma.tables.Block;
    return {
      alive: columns.alive,
      children: 'pg/jsonb@1',
      createdAt: columns.createdAt,
      createdById: columns.createdById,
      editedAt: columns.editedAt,
      editedById: columns.editedById,
      format: columns.format,
      id: columns.id,
      isDepthExceeded: 'pg/bool@1',
      lifecycle: 'pg/text@1',
      lockedAt: columns.lockedAt,
      parentId: columns.parentId,
      permissions: columns.permissions,
      properties: columns.properties,
      relation: 'pg/text@1',
      spaceId: columns.spaceId,
      text: columns.text,
      textStateBytes: columns.version,
      type: columns.type,
      version: columns.version,
    } as const;
  }
}

export const toRecord = (row: StoredBlockRow): BlockRecord => ({
  alive: row.alive,
  children: blockChildrenSchema.parse(row.children),
  createdAt: row.createdAt,
  createdById: row.createdById,
  editedAt: row.editedAt,
  editedById: row.editedById,
  format: blockJsonObjectSchema.nullable().parse(row.format),
  id: row.id,
  lifecycle: blockLifecycleSchema.parse(row.lifecycle),
  lockedAt: row.lockedAt,
  parentId: row.parentId,
  permissions: blockPermissionsSchema.parse(row.permissions),
  properties: blockJsonObjectSchema.parse(row.properties),
  spaceId: row.spaceId,
  text: row.text,
  type: row.type,
  version: row.version,
});

const toReadResult = (rows: readonly BlockRow[]): BlockReadResult => {
  const targetRows = rows.filter((row) => blockRelationSchema.parse(row.relation) === BLOCK_RELATION.target);
  return {
    context: rows.filter((row) => blockRelationSchema.parse(row.relation) === BLOCK_RELATION.context).map(toRecord),
    isDepthExceeded: rows.some((row) => row.isDepthExceeded),
    targets: targetRows.map(toRecord),
    textStateBytes: new Map(
      targetRows.flatMap((row) => (row.textStateBytes === 0 ? [] : [[row.id, row.textStateBytes] as const])),
    ),
  };
};
