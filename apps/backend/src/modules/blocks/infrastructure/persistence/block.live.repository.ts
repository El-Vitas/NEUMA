import { Injectable } from '@nestjs/common';
import { blockPermissionsSchema } from '@neuma/shared';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BLOCK_TREE_MAX_DEPTH } from '../../constants/blocks.constants';
import type { BlockChainRow } from '../../domain/block.live.domain.types';
import type { BlockChainReader, LiveAccount } from '../../types/block.live.types';

/** Reads what the live channel needs to decide who may see a block: the block and its ancestors, no content. */
@Injectable()
export class BlockLiveRepository implements BlockChainReader {
  constructor(private readonly prisma: PrismaService) {}

  /** One statement for any number of users. A user that does not exist simply has no row. */
  async readAccounts(userIds: readonly string[]): Promise<readonly LiveAccount[]> {
    if (userIds.length === 0) return [];
    const users = await this.prisma.models.User.select('id', 'role', 'isActive')
      .where((user) => user.id.in([...userIds]))
      .all();
    return users.map((user) => ({ id: user.id, isActive: user.isActive, role: user.role }));
  }

  async hasPageChangesSince(spaceId: string, since: string): Promise<boolean> {
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      SELECT "id" FROM "Block"
      WHERE "spaceId" = ${spaceId}::text AND "type" = 'page' AND "changeXid" >= ${since}::bigint
      LIMIT 1
    `
        .returnsRow({ id: columns.id })
        .build(),
    );
    return rows.length > 0;
  }

  /** One statement for any number of seeds. A chain deeper than the limit is cut there, as the page reads are. */
  async readChains(seedIds: readonly string[]): Promise<readonly BlockChainRow[]> {
    if (seedIds.length === 0) return [];
    const { columns } = this.prisma.tables.Block;
    const rows = await this.prisma.runner.query(
      this.prisma.sql`
      WITH RECURSIVE "chain" AS (
        SELECT "block"."id", "block"."parentId", 0 AS "depth"
        FROM "Block" AS "block"
        WHERE "block"."id" IN (SELECT jsonb_array_elements_text(${JSON.stringify(seedIds)}::jsonb))
        UNION
        SELECT "parent"."id", "parent"."parentId", "chain"."depth" + 1
        FROM "Block" AS "parent"
        INNER JOIN "chain" ON "parent"."id" = "chain"."parentId"
        WHERE "chain"."depth" < ${BLOCK_TREE_MAX_DEPTH}
      )
      SELECT "block"."id", "block"."parentId", "block"."spaceId", "block"."type", "block"."alive",
        "block"."permissions", ("block"."properties" -> 'template' IS NOT NULL) AS "isTemplate"
      FROM "Block" AS "block"
      WHERE "block"."id" IN (SELECT "id" FROM "chain")
    `
        .returnsRow({
          alive: columns.alive,
          id: columns.id,
          isTemplate: 'pg/bool@1',
          parentId: columns.parentId,
          permissions: columns.permissions,
          spaceId: columns.spaceId,
          type: columns.type,
        })
        .build(),
    );
    return rows.map((row) => ({
      alive: row.alive,
      id: row.id,
      isTemplate: row.isTemplate,
      parentId: row.parentId,
      permissions: blockPermissionsSchema.parse(row.permissions),
      spaceId: row.spaceId,
      type: row.type,
    }));
  }
}
