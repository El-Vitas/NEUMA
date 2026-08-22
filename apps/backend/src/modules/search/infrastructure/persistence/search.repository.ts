import { randomUUID } from 'node:crypto';
import { SearchIndexingState, SpaceVisibility } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { SEARCH_MAX_LIMIT } from '../../../../common/constants/search.constants';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { canReadSpace } from '../../../../common/domain/workspace.domain';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SEARCH_TRIGRAM_THRESHOLD } from '../../constants/search.constants';
import type {
  SearchDocumentInput,
  SearchDocumentRemoval,
  SearchEditedRange,
  SearchPageWithContext,
  SearchQueryWithFilters,
  SearchResultWithContext,
  SearchRow,
} from '../../types/search.types';
import { decodeSearchCursor, encodeSearchCursor } from '../../utils/search.cursor.utils';

const searchConfig = Prisma.sql`CASE "searchDocument"."language"
  WHEN 'en' THEN 'english'::regconfig
  WHEN 'es' THEN 'spanish'::regconfig
  ELSE 'simple'::regconfig
END`;

const queryExpression = Prisma.sql`websearch_to_tsquery(${searchConfig}, public.immutable_unaccent("input"."queryText"))`;

const mapSearchRow = (row: SearchRow): SearchResultWithContext => ({
  contentType: row.contentType,
  icon: parseStoredPageIcon(row.icon),
  parentPageId: row.parentPageId,
  parentPageTitle: row.parentPageTitle,
  rank: row.rank,
  spaceId: row.spaceId,
  spaceName: row.spaceName,
  sourceId: row.sourceId,
  sourceType: row.sourceType,
  snippet: row.snippet,
  title: row.title,
  updatedAt: row.updatedAt.toISOString(),
});

const buildSearchSql = (
  query: SearchQueryWithFilters,
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
      "searchDocument"."properties"->'icon' AS "icon",
      "searchDocument"."properties"->>'parentPageId' AS "parentPageId",
      "searchDocument"."properties"->>'parentPageTitle' AS "parentPageTitle",
      ${rankExpression} AS "rank",
      ${snippetExpression} AS "snippet",
      "searchDocument"."sourceId",
      "searchDocument"."sourceType",
      "searchDocument"."spaceId",
      "searchDocument"."properties"->>'spaceName' AS "spaceName",
      "searchDocument"."title",
      "searchDocument"."updatedAt"
    FROM "SearchDocument" AS "searchDocument"
    INNER JOIN "Space" AS "space" ON "space"."id" = "searchDocument"."spaceId"
    ${queryInput}
    WHERE "searchDocument"."indexingState" = ${SearchIndexingState.INDEXED}::"SearchIndexingState"
      AND ${matchExpression}
      AND "space"."workspaceId" = ${query.workspaceId}
      AND ${buildSearchSpaceVisibilityFilter(query.userId, query.userRole)}
      ${filters}
    ORDER BY "rank" DESC, "searchDocument"."updatedAt" DESC, "searchDocument"."sourceId" ASC
    LIMIT ${Math.min(query.limit + 1, SEARCH_MAX_LIMIT + 1)}
  `;
};

const buildEditedRangeInterval = (range: SearchEditedRange): Prisma.Sql => {
  switch (range) {
    case 'LAST_MONTH':
      return Prisma.sql`now() - interval '30 days'`;
    case 'LAST_SEVEN_DAYS':
      return Prisma.sql`now() - interval '7 days'`;
    case 'THIS_YEAR':
      return Prisma.sql`date_trunc('year', now())`;
    default:
      return Prisma.sql`date_trunc('day', now())`;
  }
};

/**
 * Which spaces a reader is allowed to find anything in.
 *
 * Every alternative is tied to the one visibility it speaks for. Saying
 * instead that some role may read restricted spaces, as a bare condition of
 * its own, does not widen the guard — it dissolves it: an alternative that is
 * simply true makes every other one moot, and the reader finds pages in every
 * space there is, private ones included.
 *
 * This mirrors `buildSpaceVisibilityFilter`, which the rest of the system
 * already reads by; written again here because a raw query cannot take a
 * Prisma `where`.
 */
export const buildSearchSpaceVisibilityFilter = (userId: string, role: UserRole): Prisma.Sql => {
  const belongsToTheReader = Prisma.sql`EXISTS (
    SELECT 1 FROM "SpaceMember" AS "spaceMember"
    WHERE "spaceMember"."spaceId" = "space"."id" AND "spaceMember"."userId" = ${userId}
  )`;
  const readsEveryRestrictedSpace = canReadSpace(role, SpaceVisibility.RESTRICTED, false);

  return Prisma.sql`(
    "space"."visibility" = ${SpaceVisibility.PUBLIC_INTERNAL}::"SpaceVisibility"
    OR (
      "space"."visibility" = ${SpaceVisibility.RESTRICTED}::"SpaceVisibility"
      AND ${readsEveryRestrictedSpace ? Prisma.sql`TRUE` : belongsToTheReader}
    )
    OR (
      "space"."visibility" = ${SpaceVisibility.PRIVATE}::"SpaceVisibility"
      AND ("space"."ownerId" = ${userId} OR ${belongsToTheReader})
    )
  )`;
};

export const buildEditedRangeFilter = (range: SearchEditedRange): Prisma.Sql =>
  Prisma.sql`AND "searchDocument"."updatedAt" >= ${buildEditedRangeInterval(range)}`;

/**
 * Only pages currently valid: verified, and either with no expiration or one
 * still in the future. Checked against `now()` at query time rather than a
 * flag baked in at projection time, so a page does not keep reading as
 * verified past its own expiration just because nobody has written in it since.
 */
export const buildVerifiedOnlyFilter = (): Prisma.Sql => Prisma.sql`AND (
  "searchDocument"."properties"->>'verifiedAt' IS NOT NULL
  AND (
    "searchDocument"."properties"->>'verificationExpiresAt' IS NULL
    OR ("searchDocument"."properties"->>'verificationExpiresAt')::timestamptz > now()
  )
)`;

const buildFilters = (
  query: SearchQueryWithFilters,
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
  if (query.authorQuery !== undefined) {
    const anywhereInTheName = `%${query.authorQuery}%`;
    filters.push(Prisma.sql`AND "searchDocument"."properties"->>'authorName' ILIKE ${anywhereInTheName}`);
  }
  if (query.editedRange !== undefined) filters.push(buildEditedRangeFilter(query.editedRange));
  if (query.verifiedOnly === true) filters.push(buildVerifiedOnlyFilter());
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

  async search(query: SearchQueryWithFilters): Promise<SearchPageWithContext> {
    const cursor = decodeSearchCursor(query.cursor);
    const rows = await this.findFullTextMatches(query, cursor);
    const usefulRows = rows.length > 0 ? rows : await this.findTrigramMatches(query, cursor);
    return this.toSearchPage(usefulRows, query.limit);
  }

  private async findFullTextMatches(
    query: SearchQueryWithFilters,
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
    query: SearchQueryWithFilters,
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

  private toSearchPage(rows: readonly SearchRow[], limit: number): SearchPageWithContext {
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
