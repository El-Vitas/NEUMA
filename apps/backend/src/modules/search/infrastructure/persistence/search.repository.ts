import { randomUUID } from 'node:crypto';
import { SearchIndexingState, SpaceVisibility } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import { Injectable } from '@nestjs/common';
import { SEARCH_MAX_LIMIT } from '../../../../common/constants/search.constants';
import { canReadSpace } from '../../../../common/domain/workspace.domain';
import type { SearchPage, SearchQuery, SearchResult } from '../../../../common/types/search.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SEARCH_TRIGRAM_THRESHOLD } from '../../constants/search.constants';
import type { SearchDocumentInput, SearchDocumentRemoval, SearchRow } from '../../types/search.types';
import { decodeSearchCursor, encodeSearchCursor } from '../../utils/search.cursor.utils';

const searchConfig = Prisma.sql`CASE "searchDocument"."language"
  WHEN 'en' THEN 'english'::regconfig
  WHEN 'es' THEN 'spanish'::regconfig
  ELSE 'simple'::regconfig
END`;

const queryExpression = Prisma.sql`websearch_to_tsquery(${searchConfig}, public.immutable_unaccent("input"."queryText"))`;

const mapSearchRow = (row: SearchRow): SearchResult => ({
  contentType: row.contentType,
  rank: row.rank,
  spaceId: row.spaceId,
  sourceId: row.sourceId,
  sourceType: row.sourceType,
  snippet: row.snippet,
  title: row.title,
  updatedAt: row.updatedAt.toISOString(),
});

const buildSearchSql = (
  query: SearchQuery,
  cursor: ReturnType<typeof decodeSearchCursor>,
  rankExpression: Prisma.Sql,
  snippetExpression: Prisma.Sql,
  matchExpression: Prisma.Sql,
  queryInput: Prisma.Sql,
): Prisma.Sql => {
  const filters = buildFilters(query, cursor, rankExpression);
  return Prisma.sql`
    SELECT
      "searchDocument"."contentType",
      ${rankExpression} AS "rank",
      ${snippetExpression} AS "snippet",
      "searchDocument"."sourceId",
      "searchDocument"."sourceType",
      "searchDocument"."spaceId",
      "searchDocument"."title",
      "searchDocument"."updatedAt"
    FROM "SearchDocument" AS "searchDocument"
    INNER JOIN "Space" AS "space" ON "space"."id" = "searchDocument"."spaceId"
    ${queryInput}
    WHERE "searchDocument"."indexingState" = ${SearchIndexingState.INDEXED}::"SearchIndexingState"
      AND ${matchExpression}
      AND "space"."workspaceId" = ${query.workspaceId}
      AND (
        "space"."visibility" = ${SpaceVisibility.PUBLIC_INTERNAL}::"SpaceVisibility"
        OR ${canReadSpace(query.userRole, SpaceVisibility.RESTRICTED, false)}
        OR EXISTS (
          SELECT 1 FROM "SpaceMember" AS "spaceMember"
          WHERE "spaceMember"."spaceId" = "searchDocument"."spaceId"
            AND "spaceMember"."userId" = ${query.userId}
        )
      )
      ${filters}
    ORDER BY "rank" DESC, "searchDocument"."updatedAt" DESC, "searchDocument"."sourceId" ASC
    LIMIT ${Math.min(query.limit + 1, SEARCH_MAX_LIMIT + 1)}
  `;
};

const buildFilters = (
  query: SearchQuery,
  cursor: ReturnType<typeof decodeSearchCursor>,
  rankExpression: Prisma.Sql,
): Prisma.Sql => {
  const filters: Prisma.Sql[] = [];
  if (query.spaceId !== undefined) filters.push(Prisma.sql`AND "searchDocument"."spaceId" = ${query.spaceId}`);
  if (query.sourceType !== undefined)
    filters.push(Prisma.sql`AND "searchDocument"."sourceType" = ${query.sourceType}::"SearchSourceType"`);
  if (query.contentType !== undefined)
    filters.push(Prisma.sql`AND "searchDocument"."contentType" = ${query.contentType}`);
  if (query.tags !== undefined && query.tags.length > 0)
    filters.push(Prisma.sql`AND "searchDocument"."tags" @> ${JSON.stringify(query.tags)}::jsonb`);
  if (cursor !== null)
    filters.push(Prisma.sql`AND (
      ${rankExpression} < ${cursor.rank}
      OR (${rankExpression} = ${cursor.rank} AND "searchDocument"."updatedAt" < ${cursor.updatedAt}::timestamptz)
      OR (${rankExpression} = ${cursor.rank} AND "searchDocument"."updatedAt" = ${cursor.updatedAt}::timestamptz
        AND "searchDocument"."sourceId" > ${cursor.sourceId})
    )`);
  return filters.length === 0 ? Prisma.empty : Prisma.join(filters, ' ');
};

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertDocument(input: SearchDocumentInput): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SearchDocument" (
        "id", "sourceType", "sourceId", "spaceId", "title", "extractedText", "language",
        "tags", "properties", "contentType", "versionMarker", "indexingState", "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${input.sourceType}::"SearchSourceType", ${input.sourceId}, ${input.spaceId}, ${input.title},
        ${input.extractedText}, ${input.language}, ${JSON.stringify(input.tags)}::jsonb,
        ${JSON.stringify(input.properties)}::jsonb, ${input.contentType}, ${input.versionMarker},
        ${SearchIndexingState.INDEXED}::"SearchIndexingState", now(), now()
      )
      ON CONFLICT ("sourceType", "sourceId") DO UPDATE SET
        "spaceId" = EXCLUDED."spaceId",
        "title" = EXCLUDED."title",
        "extractedText" = EXCLUDED."extractedText",
        "language" = EXCLUDED."language",
        "tags" = EXCLUDED."tags",
        "properties" = EXCLUDED."properties",
        "contentType" = EXCLUDED."contentType",
        "versionMarker" = EXCLUDED."versionMarker",
        "indexingState" = EXCLUDED."indexingState",
        "updatedAt" = now()
      WHERE "SearchDocument"."versionMarker" <= EXCLUDED."versionMarker"
    `);
  }

  async removeDocument(input: SearchDocumentRemoval): Promise<void> {
    await this.prisma.searchDocument.deleteMany({
      where: {
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        versionMarker: { lte: input.versionMarker },
      },
    });
  }

  async search(query: SearchQuery): Promise<SearchPage> {
    const cursor = decodeSearchCursor(query.cursor);
    const rows = await this.findFullTextMatches(query, cursor);
    const usefulRows = rows.length > 0 ? rows : await this.findTrigramMatches(query, cursor);
    return this.toSearchPage(usefulRows, query.limit);
  }

  private async findFullTextMatches(
    query: SearchQuery,
    cursor: ReturnType<typeof decodeSearchCursor>,
  ): Promise<readonly SearchRow[]> {
    const rankExpression = Prisma.sql`ts_rank_cd("searchDocument"."searchVector", ${queryExpression})`;
    const sql = buildSearchSql(
      query,
      cursor,
      rankExpression,
      Prisma.sql`ts_headline(
        ${searchConfig},
        concat_ws(E'\\n', "searchDocument"."title", "searchDocument"."extractedText"),
        ${queryExpression},
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=30,MinWords=8'
      )`,
      Prisma.sql`"searchDocument"."searchVector" @@ ${queryExpression}`,
      Prisma.sql`CROSS JOIN (SELECT ${query.query}::text AS "queryText") AS "input"`,
    );
    return this.prisma.$queryRaw<SearchRow[]>(sql);
  }

  private async findTrigramMatches(
    query: SearchQuery,
    cursor: ReturnType<typeof decodeSearchCursor>,
  ): Promise<readonly SearchRow[]> {
    const rankExpression = Prisma.sql`GREATEST(
      similarity(public.immutable_unaccent("searchDocument"."title"), public.immutable_unaccent(${query.query})),
      similarity(public.immutable_unaccent("searchDocument"."extractedText"), public.immutable_unaccent(${query.query}))
    )`;
    const sql = buildSearchSql(
      query,
      cursor,
      rankExpression,
      Prisma.sql`left(concat_ws(E'\\n', "searchDocument"."title", "searchDocument"."extractedText"), 280)`,
      Prisma.sql`${rankExpression} >= ${SEARCH_TRIGRAM_THRESHOLD}`,
      Prisma.empty,
    );
    return this.prisma.$queryRaw<SearchRow[]>(sql);
  }

  private toSearchPage(rows: readonly SearchRow[], limit: number): SearchPage {
    const hasNextPage = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const items = pageRows.map(mapSearchRow);
    const lastItem = items.at(-1);
    return {
      items,
      ...(hasNextPage && lastItem !== undefined
        ? {
            nextCursor: encodeSearchCursor({
              rank: lastItem.rank,
              sourceId: lastItem.sourceId,
              updatedAt: lastItem.updatedAt,
            }),
          }
        : {}),
    };
  }
}
