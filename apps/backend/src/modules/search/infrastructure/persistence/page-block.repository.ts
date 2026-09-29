import { PageLifecycle } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import { Injectable } from '@nestjs/common';
import { SEARCH_MAX_LIMIT } from '../../../../common/constants/search.constants';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PAGE_BLOCK_WORD_SIMILARITY_THRESHOLD } from '../../constants/search.constants';
import type {
  PageBlockRepositoryContract,
  PageBlockSearchPage,
  PageBlockSearchQuery,
  PageBlockSearchRow,
  PageBlocksProjection,
  PageBlocksRemoval,
} from '../../types/page-block.types';
import type { SearchCursor } from '../../types/search.types';
import { decodeSearchCursor, encodeSearchCursor } from '../../utils/search.cursor.utils';
import { buildSearchSpaceVisibilityFilter, buildTokenScopeFilter } from './search.repository';

const blockQueryExpression = Prisma.sql`websearch_to_tsquery('simple'::regconfig, public.immutable_unaccent("input"."queryText"))`;

/** Lo que ordena un bloque entre los que empatan: su página y su id, que juntos no se repiten. */
const blockKey = Prisma.sql`("block"."pageId" || ':' || "block"."blockId")`;

/** Solo dentro de una página y todo lo que cuelga de ella. */
const buildRootPageFilter = (rootPageId: string): Prisma.Sql => Prisma.sql`AND "block"."pageId" IN (
  WITH RECURSIVE "subtree" AS (
    SELECT "id" FROM "Page" WHERE "id" = ${rootPageId}
    UNION ALL
    SELECT "child"."id" FROM "Page" AS "child" INNER JOIN "subtree" ON "child"."parentId" = "subtree"."id"
  )
  SELECT "id" FROM "subtree"
)`;

const buildCursorFilter = (cursor: SearchCursor, rankExpression: Prisma.Sql): Prisma.Sql => Prisma.sql`AND (
  ${rankExpression} < ${cursor.rank}
  OR (${rankExpression} = ${cursor.rank} AND "block"."updatedAt" < ${cursor.updatedAt}::timestamptz)
  OR (${rankExpression} = ${cursor.rank} AND "block"."updatedAt" = ${cursor.updatedAt}::timestamptz
    AND ${blockKey} > ${cursor.sourceId})
)`;

const buildBlockFilters = (
  query: PageBlockSearchQuery,
  cursor: SearchCursor | null,
  rankExpression: Prisma.Sql,
): Prisma.Sql => {
  const filters: Prisma.Sql[] = [];
  if (query.spaceId !== undefined) filters.push(Prisma.sql`AND "page"."spaceId" = ${query.spaceId}`);
  if (query.blockType !== undefined) filters.push(Prisma.sql`AND "block"."type" = ${query.blockType}`);
  if (query.rootPageId !== undefined) filters.push(buildRootPageFilter(query.rootPageId));
  if (query.tokenScope !== undefined)
    filters.push(buildTokenScopeFilter(query.tokenScope, Prisma.sql`"page"."id"`, Prisma.sql`"page"."spaceId"`));
  if (cursor !== null) filters.push(buildCursorFilter(cursor, rankExpression));
  return filters.length === 0 ? Prisma.empty : Prisma.join(filters, ' ');
};

/**
 * La consulta de bloques. La página y su espacio salen de `Page`, no de la
 * proyección: si la página se movió y la proyección todavía no lo sabe, manda
 * dónde está hoy, y con eso la visibilidad y la regla del token.
 */
const buildBlockSearchSql = (
  query: PageBlockSearchQuery,
  cursor: SearchCursor | null,
  expressions: { readonly match: Prisma.Sql; readonly rank: Prisma.Sql; readonly snippet: Prisma.Sql },
): Prisma.Sql => Prisma.sql`
  SELECT
    "block"."blockId",
    "block"."type" AS "blockType",
    "block"."headingPath",
    "block"."pageId",
    "page"."title" AS "pageTitle",
    "parent"."title" AS "parentPageTitle",
    ${expressions.rank} AS "rank",
    ${expressions.snippet} AS "snippet",
    "page"."spaceId",
    "space"."name" AS "spaceName",
    "block"."updatedAt"
  FROM "PageBlock" AS "block"
  INNER JOIN "Page" AS "page" ON "page"."id" = "block"."pageId"
  LEFT JOIN "Page" AS "parent" ON "parent"."id" = "page"."parentId"
  INNER JOIN "Space" AS "space" ON "space"."id" = "page"."spaceId"
  CROSS JOIN (SELECT ${query.query}::text AS "queryText") AS "input"
  WHERE ${expressions.match}
    AND "page"."lifecycle" = ${PageLifecycle.ACTIVE}::"PageLifecycle"
    AND "space"."workspaceId" = ${query.workspaceId}
    AND ${buildSearchSpaceVisibilityFilter(query.userId, query.userRole)}
    ${buildBlockFilters(query, cursor, expressions.rank)}
  ORDER BY "rank" DESC, "block"."updatedAt" DESC, ${blockKey} ASC
  LIMIT ${Math.min(query.limit + 1, SEARCH_MAX_LIMIT + 1)}
`;

const toBlockSearchPage = (rows: readonly PageBlockSearchRow[], limit: number): PageBlockSearchPage => {
  const pageRows = rows.slice(0, limit);
  const items = pageRows.map((row) => ({
    blockId: row.blockId,
    blockType: row.blockType,
    headingPath: row.headingPath ?? [],
    pageId: row.pageId,
    pageTitle: row.pageTitle,
    parentPageTitle: row.parentPageTitle,
    rank: row.rank,
    snippet: row.snippet,
    spaceId: row.spaceId,
    spaceName: row.spaceName,
  }));
  const lastRow = pageRows.at(-1);
  if (rows.length <= limit || lastRow === undefined) return { items };
  return {
    items,
    nextCursor: encodeSearchCursor({
      rank: lastRow.rank,
      sourceId: `${lastRow.pageId}:${lastRow.blockId}`,
      updatedAt: lastRow.updatedAt.toISOString(),
    }),
  };
};

@Injectable()
export class PageBlockRepository implements PageBlockRepositoryContract {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cambia los bloques de una página por los de una versión.
   *
   * El proyector puede recibir los eventos fuera de orden; una versión vieja
   * que llega tarde no pisa a una más nueva. Un candado por página hace que
   * dos proyecciones de la misma página no se mezclen.
   */
  async replaceBlocks(input: PageBlocksProjection): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.pageId}))::text`;
      const newer = await transaction.pageBlock.findFirst({
        select: { blockId: true },
        where: { pageId: input.pageId, pageVersion: { gt: input.pageVersion } },
      });
      if (newer !== null) return;
      await transaction.pageBlock.deleteMany({ where: { pageId: input.pageId } });
      await transaction.pageBlock.createMany({
        data: input.blocks.map((block) => ({
          blockId: block.id,
          headingPath: [...block.headingPath],
          pageId: input.pageId,
          pageVersion: input.pageVersion,
          parentBlockId: block.parentId,
          position: block.position,
          spaceId: input.spaceId,
          text: block.text,
          type: block.type,
        })),
      });
    });
  }

  async removeBlocks(input: PageBlocksRemoval): Promise<void> {
    await this.prisma.pageBlock.deleteMany({
      where: { pageId: input.pageId, pageVersion: { lte: input.pageVersion } },
    });
  }

  /**
   * Las páginas del espacio de trabajo que tienen un bloque con ese id.
   *
   * Casi siempre es una. Pueden ser más porque duplicar una página conserva
   * los ids de sus bloques. Quién puede ver cada una lo decide quien pregunta.
   */
  async locateBlock(blockId: string, workspaceId: string): Promise<readonly string[]> {
    const blocks = await this.prisma.pageBlock.findMany({
      select: { pageId: true },
      where: { blockId, page: { lifecycle: PageLifecycle.ACTIVE, space: { workspaceId } } },
    });
    return blocks.map((block) => block.pageId);
  }

  async searchBlocks(query: PageBlockSearchQuery): Promise<PageBlockSearchPage> {
    const cursor = decodeSearchCursor(query.cursor);
    const rows = await this.findFullTextMatches(query, cursor);
    const usefulRows = rows.length > 0 ? rows : await this.findTrigramMatches(query, cursor);
    return toBlockSearchPage(usefulRows, query.limit);
  }

  private findFullTextMatches(query: PageBlockSearchQuery, cursor: SearchCursor | null): Promise<PageBlockSearchRow[]> {
    const rank = Prisma.sql`ts_rank_cd("block"."searchVector", ${blockQueryExpression})`;
    return this.prisma.$queryRaw<PageBlockSearchRow[]>(
      buildBlockSearchSql(query, cursor, {
        match: Prisma.sql`"block"."searchVector" @@ ${blockQueryExpression}`,
        rank,
        snippet: Prisma.sql`ts_headline(
          'simple'::regconfig,
          "block"."text",
          ${blockQueryExpression},
          'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=30,MinWords=8'
        )`,
      }),
    );
  }

  private findTrigramMatches(query: PageBlockSearchQuery, cursor: SearchCursor | null): Promise<PageBlockSearchRow[]> {
    const rank = Prisma.sql`strict_word_similarity(public.immutable_unaccent("input"."queryText"), public.immutable_unaccent("block"."text"))`;
    return this.prisma.$queryRaw<PageBlockSearchRow[]>(
      buildBlockSearchSql(query, cursor, {
        match: Prisma.sql`${rank} >= ${PAGE_BLOCK_WORD_SIMILARITY_THRESHOLD}`,
        rank,
        snippet: Prisma.sql`left("block"."text", 280)`,
      }),
    );
  }
}
