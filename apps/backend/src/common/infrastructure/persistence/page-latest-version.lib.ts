import type { NeumaTransaction } from '@neuma/db';
import type { PrismaService } from '../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../prisma/prisma.sql.lib';

/** The highest saved version of each page; a page with no saved version is absent from the map. */
export const findLatestPageVersions = async (
  prisma: PrismaService,
  pageIds: readonly string[],
  transaction?: NeumaTransaction,
): Promise<ReadonlyMap<string, number>> => {
  if (pageIds.length === 0) return new Map();
  const { columns } = prisma.tables.PageVersion;
  const rows = await prisma.runnerFor(transaction).query(
    prisma.sql`
      SELECT "pageId", max("version") AS "version"
      FROM "PageVersion"
      WHERE "pageId" = ANY(${buildSqlTextList(prisma.sql, pageIds)})
      GROUP BY "pageId"
    `
      .returnsRow({ pageId: columns.pageId, version: columns.version })
      .build(),
  );
  return new Map(rows.map((row) => [row.pageId, row.version]));
};
