import type { AccessTokenPlace } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ACCESS_TOKEN_EMPTY_PAGE_REACH } from '../../constants/access-token.constants';
import type {
  AccessTokenLineageRow,
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

/**
 * El árbol de páginas tal como está en el momento de decidir.
 *
 * Los dos recorridos cortan un ciclo con el camino ya andado y no con una
 * profundidad máxima: con un tope, una página más honda que el tope quedaría
 * fuera de la exclusión que la cubre, y se vería.
 */
@Injectable()
export class AccessTokenPlaceRepository implements AccessTokenPlaceReader {
  constructor(private readonly prisma: PrismaService) {}

  async readPlace(pageId: string, workspaceId: string): Promise<AccessTokenPlace | null> {
    const rows = await this.prisma.$queryRaw<AccessTokenLineageRow[]>`
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
    `;
    const page = rows.at(0);
    if (page === undefined) return null;
    return { lineage: rows.map((row) => row.id), spaceId: page.spaceId };
  }

  /**
   * Baja cada regla por todo lo que cuelga de su página y deja, para cada
   * página alcanzada, la regla más cercana: la de menor distancia hacia arriba.
   */
  async resolvePageReach(
    rules: readonly AccessTokenPageRuleProbe[],
    workspaceId: string,
  ): Promise<AccessTokenPageReach> {
    if (rules.length === 0) return ACCESS_TOKEN_EMPTY_PAGE_REACH;
    const rows = await this.prisma.$queryRaw<AccessTokenReachRow[]>`
      WITH RECURSIVE "rule" AS (
        SELECT * FROM unnest(${rules.map((rule) => rule.pageId)}::text[], ${rules.map((rule) => rule.allows)}::boolean[])
          AS "rule"("pageId", "allows")
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
    `;
    return toReach(rows);
  }
}
