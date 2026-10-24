import { Injectable } from '@nestjs/common';
import { BLOCK_TYPE } from '@neuma/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../prisma/prisma.sql.lib';
import { BLOCK_PAGE_LOOKUP_MAX_DEPTH } from '../../constants/block-page.constants';
import { readBlockTitle } from '../../domain/block-access.domain';
import type { BlockPageLocation } from '../../types/block-page.types';

/** Finds the page each block lives in: the block itself when it is a page, else its nearest ancestor that is one. */
@Injectable()
export class BlockPageLocator {
  constructor(private readonly prisma: PrismaService) {}

  async locate(blockIds: readonly string[]): Promise<ReadonlyMap<string, BlockPageLocation>> {
    const uniqueIds = [...new Set(blockIds)];
    if (uniqueIds.length === 0) return new Map();
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "up" AS (
        SELECT "id" AS "origin", "id", "parentId", "spaceId", "type", "properties", 0 AS "depth"
        FROM "Block"
        WHERE "id" = ANY(${buildSqlTextList(this.prisma.sql, uniqueIds)})
        UNION ALL
        SELECT "up"."origin", "parent"."id", "parent"."parentId", "parent"."spaceId", "parent"."type",
          "parent"."properties", "up"."depth" + 1
        FROM "Block" AS "parent"
        INNER JOIN "up" ON "parent"."id" = "up"."parentId"
        WHERE "up"."type" <> ${BLOCK_TYPE.page} AND "up"."depth" < ${BLOCK_PAGE_LOOKUP_MAX_DEPTH}
      )
      SELECT DISTINCT ON ("origin") "origin", "id" AS "pageId", "spaceId", "properties"
      FROM "up"
      WHERE "type" = ${BLOCK_TYPE.page}
      ORDER BY "origin", "depth"
    `
        .returnsRow({
          origin: columns.id,
          pageId: columns.id,
          properties: columns.properties,
          spaceId: columns.spaceId,
        })
        .build(),
    );
    return new Map(
      rows.map((row) => [
        row.origin,
        { pageId: row.pageId, pageTitle: readBlockTitle(row.properties), spaceId: row.spaceId },
      ]),
    );
  }
}
