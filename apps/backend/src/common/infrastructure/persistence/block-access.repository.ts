import { Injectable } from '@nestjs/common';
import { BLOCK_TYPE, blockPermissionsSchema } from '@neuma/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../prisma/prisma.sql.lib';
import { listReadableBlockIds, readBlockTitle } from '../../domain/block-access.domain';
import type { BlockAccessChainRow, BlockAccessViewer, ReadablePage } from '../../types/block-access.types';
import { buildSpaceVisibilityFilter } from './space.visibility.filter';

/**
 * Which blocks a viewer may read, by the same rule the block sync uses: the nearest declaring ancestor decides, the
 * space must be visible, and a block under a trashed or removed ancestor is not readable.
 */
@Injectable()
export class BlockAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findReadableBlockIds(blockIds: readonly string[], viewer: BlockAccessViewer): Promise<ReadonlySet<string>> {
    const uniqueIds = [...new Set(blockIds)];
    if (uniqueIds.length === 0) return new Set();
    const rows = await this.readChains(uniqueIds, viewer.workspaceId);
    const readableSpaceIds = await this.findReadableSpaceIds(rows, viewer);
    return listReadableBlockIds({ readableSpaceIds, rows, viewer });
  }

  /** The readable blocks among the ids that are pages, with the title and space the page block holds. */
  async findReadablePages(pageIds: readonly string[], viewer: BlockAccessViewer): Promise<readonly ReadablePage[]> {
    const readableIds = await this.findReadableBlockIds(pageIds, viewer);
    if (readableIds.size === 0) return [];
    const pages = await this.prisma.models.Block.where({ type: BLOCK_TYPE.page })
      .where((block) => block.id.in([...readableIds]))
      .select('id', 'properties', 'spaceId')
      .all();
    return pages.map((page) => ({ id: page.id, spaceId: page.spaceId, title: readBlockTitle(page.properties) }));
  }

  private async readChains(candidateIds: readonly string[], workspaceId: string): Promise<BlockAccessChainRow[]> {
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "chain" AS (
        SELECT "block"."id" AS "candidateId", "block"."id", "block"."parentId", "block"."spaceId",
          "block"."permissions", "block"."alive", "block"."lifecycle"::text AS "lifecycle", 0 AS "depth",
          ARRAY["block"."id"] AS "path"
        FROM "Block" AS "block"
        INNER JOIN "Space" AS "space" ON "space"."id" = "block"."spaceId"
        WHERE "block"."id" = ANY(${buildSqlTextList(this.prisma.sql, candidateIds)})
          AND "space"."workspaceId" = ${workspaceId}
        UNION ALL
        SELECT "chain"."candidateId", "parent"."id", "parent"."parentId", "parent"."spaceId",
          "parent"."permissions", "parent"."alive", "parent"."lifecycle"::text, "chain"."depth" + 1,
          "chain"."path" || "parent"."id"
        FROM "Block" AS "parent"
        INNER JOIN "chain" ON "parent"."id" = "chain"."parentId"
        WHERE NOT "parent"."id" = ANY("chain"."path")
      )
      SELECT "candidateId", "id", "spaceId", "permissions", "alive", "lifecycle"
      FROM "chain"
      ORDER BY "candidateId", "depth"
    `
        .returnsRow({
          alive: columns.alive,
          candidateId: columns.id,
          id: columns.id,
          lifecycle: 'pg/text@1',
          permissions: columns.permissions,
          spaceId: columns.spaceId,
        })
        .build(),
    );
    return rows.map((row) => ({ ...row, permissions: blockPermissionsSchema.parse(row.permissions) }));
  }

  private async findReadableSpaceIds(
    rows: readonly BlockAccessChainRow[],
    viewer: BlockAccessViewer,
  ): Promise<ReadonlySet<string>> {
    const spaceIds = [...new Set(rows.map((row) => row.spaceId))];
    if (spaceIds.length === 0) return new Set();
    const spaces = await this.prisma.models.Space.select('id')
      .where({ workspaceId: viewer.workspaceId })
      .where((space) => space.id.in(spaceIds))
      .where(buildSpaceVisibilityFilter(viewer.userId, viewer.role))
      .all();
    return new Set(spaces.map((space) => space.id));
  }
}
