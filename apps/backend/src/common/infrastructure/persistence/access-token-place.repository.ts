import { Injectable } from '@nestjs/common';
import type { AccessTokenPlace } from '@neuma/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../prisma/prisma.sql.lib';
import { ACCESS_TOKEN_EMPTY_PAGE_REACH } from '../../constants/access-token.constants';
import type {
  AccessTokenLineageRow,
  AccessTokenOriginLineageRow,
  AccessTokenPageReach,
  AccessTokenPageRuleProbe,
  AccessTokenPlaceReader,
  AccessTokenReachRow,
} from '../../types/access-token.types';

const toReach = (rows: readonly AccessTokenReachRow[]): AccessTokenPageReach => {
  const allowed = rows.filter((row) => row.allows);
  return {
    allowedPageIds: allowed.map((row) => row.id),
    closedPageIds: rows.filter((row) => !row.allows).map((row) => row.id),
    spaceIdsWithAllowedPages: [...new Set(allowed.map((row) => row.spaceId))],
  };
};

const groupLineages = (rows: readonly AccessTokenOriginLineageRow[]): ReadonlyMap<string, AccessTokenPlace> => {
  const places = new Map<string, AccessTokenPlace>();
  for (const row of rows) {
    const known = places.get(row.originId);
    places.set(
      row.originId,
      known === undefined
        ? { lineage: [row.id], spaceId: row.spaceId }
        : { ...known, lineage: [...known.lineage, row.id] },
    );
  }
  return places;
};

/** Cycles are cut by the visited path, not a depth cap: a cap would let a deep page escape its exclusion. */
@Injectable()
export class AccessTokenPlaceRepository implements AccessTokenPlaceReader {
  constructor(private readonly prisma: PrismaService) {}

  async readPlace(pageId: string, workspaceId: string): Promise<AccessTokenPlace | null> {
    const { columns } = this.prisma.tables.Page;
    const statement = this.prisma.sql`
      WITH RECURSIVE "line" AS (
        SELECT "page"."id", "page"."parentId", "page"."spaceId", 0 AS "depth", ARRAY["page"."id"] AS "path"
        FROM "Page" AS "page"
        INNER JOIN "Space" AS "space" ON "space"."id" = "page"."spaceId"
        WHERE "page"."id" = ${pageId} AND "space"."workspaceId" = ${workspaceId}
        UNION ALL
        SELECT "parent"."id", "parent"."parentId", "parent"."spaceId", "line"."depth" + 1, "line"."path" || "parent"."id"
        FROM "Page" AS "parent"
        INNER JOIN "line" ON "parent"."id" = "line"."parentId"
        WHERE NOT "parent"."id" = ANY("line"."path")
      )
      SELECT "id", "spaceId" FROM "line" ORDER BY "depth" ASC
    `.returnsRow({ id: columns.id, spaceId: columns.spaceId });
    const rows: readonly AccessTokenLineageRow[] = await this.prisma.runner.query(statement.build());
    const page = rows.at(0);
    if (page === undefined) return null;
    return { lineage: rows.map((row) => row.id), spaceId: page.spaceId };
  }

  async readPlaces(pageIds: readonly string[], workspaceId: string): Promise<ReadonlyMap<string, AccessTokenPlace>> {
    if (pageIds.length === 0) return new Map();
    const { columns } = this.prisma.tables.Page;
    const statement = this.prisma.sql`
      WITH RECURSIVE "line" AS (
        SELECT "page"."id" AS "originId", "page"."id", "page"."parentId", "page"."spaceId", 0 AS "depth",
          ARRAY["page"."id"] AS "path"
        FROM "Page" AS "page"
        INNER JOIN "Space" AS "space" ON "space"."id" = "page"."spaceId"
        WHERE "page"."id" = ANY(${buildSqlTextList(this.prisma.sql, pageIds)}) AND "space"."workspaceId" = ${workspaceId}
        UNION ALL
        SELECT "line"."originId", "parent"."id", "parent"."parentId", "parent"."spaceId", "line"."depth" + 1,
          "line"."path" || "parent"."id"
        FROM "Page" AS "parent"
        INNER JOIN "line" ON "parent"."id" = "line"."parentId"
        WHERE NOT "parent"."id" = ANY("line"."path")
      )
      SELECT "originId", "id", "spaceId" FROM "line" ORDER BY "originId" ASC, "depth" ASC
    `.returnsRow({ id: columns.id, originId: columns.id, spaceId: columns.spaceId });
    const rows: readonly AccessTokenOriginLineageRow[] = await this.prisma.runner.query(statement.build());
    return groupLineages(rows);
  }

  /** Walks each rule down its page's subtree and keeps, per reached page, the nearest rule. */
  async resolvePageReach(
    rules: readonly AccessTokenPageRuleProbe[],
    workspaceId: string,
  ): Promise<AccessTokenPageReach> {
    if (rules.length === 0) return ACCESS_TOKEN_EMPTY_PAGE_REACH;
    const { columns } = this.prisma.tables.Page;
    const ruleRows = JSON.stringify(rules.map((rule) => ({ allows: rule.allows, pageId: rule.pageId })));
    const statement = this.prisma.sql`
      WITH RECURSIVE "rule" AS (
        SELECT * FROM jsonb_to_recordset(${ruleRows}::jsonb) AS "rule"("pageId" text, "allows" boolean)
      ),
      "reach" AS (
        SELECT "page"."id", "page"."spaceId", "rule"."allows", 0 AS "distance", ARRAY["page"."id"] AS "path"
        FROM "Page" AS "page"
        INNER JOIN "rule" ON "rule"."pageId" = "page"."id"
        INNER JOIN "Space" AS "space" ON "space"."id" = "page"."spaceId"
        WHERE "space"."workspaceId" = ${workspaceId}
        UNION ALL
        SELECT "child"."id", "child"."spaceId", "reach"."allows", "reach"."distance" + 1, "reach"."path" || "child"."id"
        FROM "Page" AS "child"
        INNER JOIN "reach" ON "child"."parentId" = "reach"."id"
        WHERE NOT "child"."id" = ANY("reach"."path")
      )
      SELECT DISTINCT ON ("id") "id", "spaceId", "allows"
      FROM "reach"
      ORDER BY "id", "distance" ASC
    `.returnsRow({ allows: 'pg/bool@1', id: columns.id, spaceId: columns.spaceId });
    const rows: readonly AccessTokenReachRow[] = await this.prisma.runner.query(statement.build());
    return toReach(rows);
  }
}
