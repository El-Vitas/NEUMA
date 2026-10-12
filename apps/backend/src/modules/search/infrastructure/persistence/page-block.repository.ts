import { Injectable } from '@nestjs/common';
import { and, type JsonValue, PageLifecycle } from '@neuma/db';
import { SEARCH_MAX_LIMIT } from '../../../../common/constants/search.constants';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NeumaSqlTag } from '../../../../prisma/types/prisma.types';
import {
  PAGE_BLOCK_WORD_SIMILARITY_THRESHOLD,
  SEARCH_STRICT_WORD_SIMILARITY_SETTING,
} from '../../constants/search.constants';
import type {
  PageBlockRepositoryContract,
  PageBlockSearchPage,
  PageBlockSearchQuery,
  PageBlockSearchRow,
  PageBlocksProjection,
  PageBlocksRemoval,
} from '../../types/page-block.types';
import type { BlockExpressions, SqlFragment } from '../../types/search.sql.types';
import type { SearchCursor } from '../../types/search.types';
import { decodeSearchCursor, encodeSearchCursor } from '../../utils/search.cursor.utils';
import { buildSearchAnywherePattern, buildSearchInsideWordPattern } from '../../utils/search.pattern.utils';
import { allOf, asBoolean, asReal, asText } from '../../utils/search.sql.utils';
import {
  buildEditedRangeFilter,
  buildInsideWordMatch,
  buildSearchSpaceVisibilityFilter,
  buildTokenScopeFilter,
  buildWordRank,
  setTrigramThreshold,
} from './search.repository';

const buildBlockQueryExpression = (sql: NeumaSqlTag): SqlFragment =>
  asText(sql`websearch_to_tsquery('simple'::regconfig, public.immutable_unaccent("input"."queryText"))`);

/** Tie-breaker: page id plus block id is unique. */
const buildBlockKey = (sql: NeumaSqlTag): SqlFragment => asText(sql`("block"."pageId" || ':' || "block"."blockId")`);

/** `UNION` rather than `UNION ALL` so a corrupt cycle in the tree still terminates. */
const buildRootPageFilter = (sql: NeumaSqlTag, rootPageId: string): SqlFragment =>
  asBoolean(sql`"block"."pageId" IN (
  WITH RECURSIVE "subtree" AS (
    SELECT "id" FROM "Page" WHERE "id" = ${rootPageId}
    UNION
    SELECT "child"."id" FROM "Page" AS "child" INNER JOIN "subtree" ON "child"."parentId" = "subtree"."id"
  )
  SELECT "id" FROM "subtree"
)`);

const buildCursorFilter = (sql: NeumaSqlTag, cursor: SearchCursor, rankExpression: SqlFragment): SqlFragment =>
  asBoolean(sql`(
  ${rankExpression} < ${cursor.rank}
  OR (${rankExpression} = ${cursor.rank} AND "block"."updatedAt" < ${cursor.updatedAt}::timestamptz)
  OR (${rankExpression} = ${cursor.rank} AND "block"."updatedAt" = ${cursor.updatedAt}::timestamptz
    AND ${buildBlockKey(sql)} > ${cursor.sourceId})
)`);

const buildPageIsVerified = (sql: NeumaSqlTag): SqlFragment =>
  asBoolean(sql`(
  "page"."verifiedAt" IS NOT NULL
  AND ("page"."verificationExpiresAt" IS NULL OR "page"."verificationExpiresAt" > now())
)`);

const buildAuthorFilter = (sql: NeumaSqlTag, authorQuery: string): SqlFragment =>
  asBoolean(sql`EXISTS (
  SELECT 1 FROM "User" AS "author"
  WHERE "author"."id" = "page"."createdById" AND "author"."name" ILIKE ${buildSearchAnywherePattern(authorQuery)}
)`);

const buildPageFilters = (sql: NeumaSqlTag, query: PageBlockSearchQuery): SqlFragment[] => [
  ...(query.verifiedOnly === true ? [buildPageIsVerified(sql)] : []),
  ...(query.authorQuery === undefined ? [] : [buildAuthorFilter(sql, query.authorQuery)]),
  ...(query.editedRange === undefined
    ? []
    : [buildEditedRangeFilter(sql, query.editedRange, asText(sql`"page"."updatedAt"`))]),
];

const buildBlockFilters = (
  sql: NeumaSqlTag,
  query: PageBlockSearchQuery,
  cursor: SearchCursor | null,
  rankExpression: SqlFragment,
): SqlFragment => {
  const filters: SqlFragment[] = [...buildPageFilters(sql, query)];
  if (query.spaceId !== undefined) filters.push(asBoolean(sql`"page"."spaceId" = ${query.spaceId}`));
  if (query.blockType !== undefined) filters.push(asBoolean(sql`"block"."type" = ${query.blockType}`));
  if (query.rootPageId !== undefined) filters.push(buildRootPageFilter(sql, query.rootPageId));
  if (query.tokenScope !== undefined)
    filters.push(buildTokenScopeFilter(sql, query.tokenScope, asText(sql`"page"."id"`), asText(sql`"page"."spaceId"`)));
  if (cursor !== null) filters.push(buildCursorFilter(sql, cursor, rankExpression));
  return allOf(sql, filters);
};

/** Page and space come from `Page`, not the projection, so a moved page is judged by where it is now. */
const buildBlockSearchSql = (
  prisma: PrismaService,
  query: PageBlockSearchQuery,
  cursor: SearchCursor | null,
  expressions: BlockExpressions,
) => {
  const { sql } = prisma;
  const blockColumns = prisma.tables.PageBlock.columns;
  const pageColumns = prisma.tables.Page.columns;
  const spaceColumns = prisma.tables.Space.columns;
  return sql`
  SELECT
    "block"."blockId",
    "block"."type" AS "blockType",
    to_jsonb("block"."headingPath") AS "headingPath",
    ${buildPageIsVerified(sql)} AS "isPageVerified",
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
    AND ${buildSearchSpaceVisibilityFilter(sql, query.userId, query.userRole)}
    AND ${buildBlockFilters(sql, query, cursor, expressions.rank)}
  ORDER BY "rank" DESC, "block"."updatedAt" DESC, ${buildBlockKey(sql)} ASC
  LIMIT ${Math.min(query.limit + 1, SEARCH_MAX_LIMIT + 1)}
`
    .returnsRow({
      blockId: blockColumns.blockId,
      blockType: blockColumns.type,
      headingPath: 'pg/jsonb@1',
      isPageVerified: 'pg/bool@1',
      pageId: blockColumns.pageId,
      pageTitle: pageColumns.title,
      parentPageTitle: { codecId: 'pg/text@1', nullable: true },
      rank: 'pg/float4@1',
      snippet: 'pg/text@1',
      spaceId: pageColumns.spaceId,
      spaceName: spaceColumns.name,
      updatedAt: 'pg/timestamptz-date@1',
    })
    .build();
};

/** Raw array columns arrive as Postgres text, so the path is read as JSON instead. */
const readHeadingPath = (value: JsonValue): readonly string[] =>
  Array.isArray(value) ? value.filter((heading): heading is string => typeof heading === 'string') : [];

const toBlockSearchPage = (rows: readonly PageBlockSearchRow[], limit: number): PageBlockSearchPage => {
  const pageRows = rows.slice(0, limit);
  const items = pageRows.map((row) => ({
    blockId: row.blockId,
    blockType: row.blockType,
    headingPath: readHeadingPath(row.headingPath),
    isPageVerified: row.isPageVerified,
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

  /** Events arrive out of order, so an older version never overwrites a newer one; a page lock serializes writes. */
  async replaceBlocks(input: PageBlocksProjection): Promise<void> {
    await this.prisma.transaction(async (transaction) => {
      await transaction.execute(
        this.prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.pageId}))::text`.affectedCount().build(),
      );
      const blocks = transaction.orm.public.PageBlock;
      const newer = await blocks
        .where({ pageId: input.pageId })
        .where((block) => block.pageVersion.gt(input.pageVersion))
        .select('blockId')
        .first();
      if (newer !== null) return;
      await blocks.where({ pageId: input.pageId }).deleteAndCount();
      if (input.blocks.length === 0) return;
      await blocks.createAndCount(
        input.blocks.map((block) => ({
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
      );
    });
  }

  async removeBlocks(input: PageBlocksRemoval): Promise<void> {
    await this.prisma.models.PageBlock.where({ pageId: input.pageId })
      .where((block) => block.pageVersion.lte(input.pageVersion))
      .deleteAndCount();
  }

  /** Can return several pages because duplicating a page keeps its block ids. The caller decides visibility. */
  async locateBlock(blockId: string, workspaceId: string): Promise<readonly string[]> {
    const blocks = await this.prisma.models.PageBlock.where({ blockId })
      .where((block) =>
        block.page.some((page) => and(page.lifecycle.eq(PageLifecycle.ACTIVE), page.space.some({ workspaceId }))),
      )
      .select('pageId')
      .all();
    return blocks.map((block) => block.pageId);
  }

  async searchBlocks(query: PageBlockSearchQuery): Promise<PageBlockSearchPage> {
    const cursor = decodeSearchCursor(query.cursor);
    const rows = await this.findFullTextMatches(query, cursor);
    const usefulRows = rows.length > 0 ? rows : await this.findTrigramMatches(query, cursor);
    return toBlockSearchPage(usefulRows, query.limit);
  }

  private async findFullTextMatches(
    query: PageBlockSearchQuery,
    cursor: SearchCursor | null,
  ): Promise<readonly PageBlockSearchRow[]> {
    const { sql } = this.prisma;
    const blockQueryExpression = buildBlockQueryExpression(sql);
    const vector = asText(sql`"block"."searchVector"`);
    const wholeWord = asBoolean(sql`${vector} @@ ${blockQueryExpression}`);
    const insideText = buildInsideWordMatch(
      sql,
      asText(sql`"block"."text"`),
      buildSearchInsideWordPattern(query.query),
    );
    const rank = buildWordRank(sql, {
      insideText,
      insideTitle: asBoolean(sql`FALSE`),
      vector,
      wholeWord,
      wordQuery: blockQueryExpression,
    });
    return this.prisma.runner.query(
      buildBlockSearchSql(this.prisma, query, cursor, {
        match: asBoolean(sql`(${wholeWord} OR ${insideText})`),
        rank,
        snippet: asText(sql`ts_headline(
          'simple'::regconfig,
          "block"."text",
          ${blockQueryExpression},
          'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=30,MinWords=8'
        )`),
      }),
    );
  }

  /** Index-backed operator with a transaction-local threshold; the explicit comparison ignores database settings. */
  private async findTrigramMatches(
    query: PageBlockSearchQuery,
    cursor: SearchCursor | null,
  ): Promise<readonly PageBlockSearchRow[]> {
    const { sql } = this.prisma;
    const searched = asText(sql`public.immutable_unaccent("input"."queryText")`);
    const text = asText(sql`public.immutable_unaccent("block"."text")`);
    const rank = asReal(sql`strict_word_similarity(${searched}, ${text})`);
    const statement = buildBlockSearchSql(this.prisma, query, cursor, {
      match: asBoolean(sql`${searched} <<% ${text} AND ${rank} >= ${PAGE_BLOCK_WORD_SIMILARITY_THRESHOLD}`),
      rank,
      snippet: asText(sql`left("block"."text", 280)`),
    });
    return this.prisma.transaction(async (transaction) => {
      await setTrigramThreshold(
        transaction,
        sql,
        SEARCH_STRICT_WORD_SIMILARITY_SETTING,
        PAGE_BLOCK_WORD_SIMILARITY_THRESHOLD,
      );
      return transaction.query(statement);
    });
  }
}
