import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SearchIndexingState, SpaceVisibility } from '@neuma/db';
import { Prisma } from '@neuma/db/generated';
import type { UserRole } from '@neuma/shared';
import { SEARCH_MAX_LIMIT } from '../../../../common/constants/search.constants';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { canReadSpace } from '../../../../common/domain/workspace.domain';
import type { SearchTokenScope } from '../../../../common/types/search.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  SEARCH_INSIDE_TEXT_RANK,
  SEARCH_INSIDE_TITLE_RANK,
  SEARCH_SIMILARITY_SETTING,
  SEARCH_TEXT_RANK_NORMALIZATION,
  SEARCH_TRIGRAM_THRESHOLD,
  SEARCH_WHOLE_WORD_RANK,
} from '../../constants/search.constants';
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
import { buildSearchAnywherePattern, buildSearchInsideWordPattern } from '../../utils/search.pattern.utils';

const searchConfig = Prisma.sql`CASE "searchDocument"."language"
  WHEN 'en' THEN 'english'::regconfig
  WHEN 'es' THEN 'spanish'::regconfig
  ELSE 'simple'::regconfig
END`;

const queryExpression = Prisma.sql`websearch_to_tsquery(${searchConfig}, public.immutable_unaccent("input"."queryText"))`;

const queryIn = (config: Prisma.Sql): Prisma.Sql =>
  Prisma.sql`websearch_to_tsquery(${config}, public.immutable_unaccent("input"."queryText"))`;

/**
 * One branch per language with a fixed config: a config read from a column cannot use the vector index.
 * Languages match those used to build the vector.
 */
const buildWholeWordMatch = (vector: Prisma.Sql): Prisma.Sql => Prisma.sql`(
  ("searchDocument"."language" = 'en' AND ${vector} @@ ${queryIn(Prisma.sql`'english'::regconfig`)})
  OR ("searchDocument"."language" = 'es' AND ${vector} @@ ${queryIn(Prisma.sql`'spanish'::regconfig`)})
  OR (
    "searchDocument"."language" IS DISTINCT FROM 'en'
    AND "searchDocument"."language" IS DISTINCT FROM 'es'
    AND ${vector} @@ ${queryIn(Prisma.sql`'simple'::regconfig`)}
  )
)`;

/** Transaction-local, so pg_trgm operators use the index with this threshold. */
export const buildTrigramThresholdSetting = (setting: string, threshold: number): Prisma.Sql =>
  Prisma.sql`SELECT set_config(${setting}, ${String(threshold)}, true)`;

/** Accent- and case-insensitive; a null pattern (query too short) never matches. */
export const buildInsideWordMatch = (column: Prisma.Sql, pattern: string | null): Prisma.Sql =>
  pattern === null
    ? Prisma.sql`FALSE`
    : Prisma.sql`public.immutable_unaccent(${column}) ILIKE public.immutable_unaccent(${pattern})`;

/** Tiers: whole word first (most similar first), then inside a title word, then inside a text word. */
export const buildWordRank = (matches: {
  readonly insideText: Prisma.Sql;
  readonly insideTitle: Prisma.Sql;
  readonly vector: Prisma.Sql;
  readonly wholeWord: Prisma.Sql;
  readonly wordQuery: Prisma.Sql;
}): Prisma.Sql => {
  const { insideText, insideTitle, vector, wholeWord, wordQuery } = matches;
  return Prisma.sql`(CASE
    WHEN ${wholeWord} THEN ${SEARCH_WHOLE_WORD_RANK} + ts_rank_cd(${vector}, ${wordQuery}, ${SEARCH_TEXT_RANK_NORMALIZATION})
    WHEN ${insideTitle} THEN ${SEARCH_INSIDE_TITLE_RANK}
    WHEN ${insideText} THEN ${SEARCH_INSIDE_TEXT_RANK}
    ELSE 0
  END)::real`;
};

const mapSearchRow = (row: SearchRow): SearchResultWithContext => ({
  contentType: row.contentType,
  icon: parseStoredPageIcon(row.icon),
  isVerified: row.isVerified,
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
      ${documentIsVerified} AS "isVerified",
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
 * Mirrors `buildSpaceVisibilityFilter`, duplicated because raw SQL cannot take a Prisma `where`.
 * Each role condition stays inside its own visibility branch: a bare TRUE alternative would make
 * every other one moot and expose private spaces.
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

export const buildEditedRangeFilter = (
  range: SearchEditedRange,
  updatedAtColumn: Prisma.Sql = Prisma.sql`"searchDocument"."updatedAt"`,
): Prisma.Sql => Prisma.sql`AND ${updatedAtColumn} >= ${buildEditedRangeInterval(range)}`;

/** Evaluated against `now()` at query time, so an expired verification stops matching without a rewrite. */
const documentIsVerified = Prisma.sql`(
  "searchDocument"."properties"->>'verifiedAt' IS NOT NULL
  AND (
    "searchDocument"."properties"->>'verificationExpiresAt' IS NULL
    OR ("searchDocument"."properties"->>'verificationExpiresAt')::timestamptz > now()
  )
)`;

export const buildVerifiedOnlyFilter = (): Prisma.Sql => Prisma.sql`AND ${documentIsVerified}`;

const buildSpaceLevelTokenFilter = (scope: SearchTokenScope, spaceColumn: Prisma.Sql): Prisma.Sql =>
  scope.readsEverywhere
    ? Prisma.sql`NOT ${spaceColumn} = ANY(${[...scope.closedSpaceIds]}::text[])`
    : Prisma.sql`${spaceColumn} = ANY(${[...scope.openSpaceIds]}::text[])`;

/**
 * Same rule as reading: a page with its own or inherited rule follows it, the rest follow their
 * space's rule. Added to the user's visibility, never replacing it. Columns are parameters because
 * pages and blocks are both searched.
 */
export const buildTokenScopeFilter = (
  scope: SearchTokenScope,
  pageColumn: Prisma.Sql,
  spaceColumn: Prisma.Sql,
): Prisma.Sql => Prisma.sql`AND (
  ${pageColumn} = ANY(${[...scope.allowedPageIds]}::text[])
  OR (
    NOT ${pageColumn} = ANY(${[...scope.closedPageIds]}::text[])
    AND ${buildSpaceLevelTokenFilter(scope, spaceColumn)}
  )
)`;

const buildFilters = (
  query: SearchQueryWithFilters,
  cursor: ReturnType<typeof decodeSearchCursor>,
  rankExpression: Prisma.Sql,
): Prisma.Sql => {
  const filters: Prisma.Sql[] = [];
  if (query.spaceId !== undefined) filters.push(Prisma.sql`AND "searchDocument"."spaceId" = ${query.spaceId}`);
  if (query.tokenScope !== undefined)
    filters.push(
      buildTokenScopeFilter(
        query.tokenScope,
        Prisma.sql`"searchDocument"."sourceId"`,
        Prisma.sql`"searchDocument"."spaceId"`,
      ),
    );
  if (query.sourceType !== undefined)
    filters.push(Prisma.sql`AND "searchDocument"."sourceType" = ${query.sourceType}::"SearchSourceType"`);
  if (query.contentType !== undefined)
    filters.push(Prisma.sql`AND "searchDocument"."contentType" = ${query.contentType}`);
  if (query.tags !== undefined && query.tags.length > 0)
    filters.push(Prisma.sql`AND "searchDocument"."tags" @> ${JSON.stringify(query.tags)}::jsonb`);
  if (query.authorQuery !== undefined)
    filters.push(
      Prisma.sql`AND "searchDocument"."properties"->>'authorName' ILIKE ${buildSearchAnywherePattern(query.authorQuery)}`,
    );
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
        ${SearchIndexingState.INDEXED}::"SearchIndexingState", now(), ${input.editedAt}
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
        "updatedAt" = EXCLUDED."updatedAt"
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
    const vector = Prisma.sql`"searchDocument"."searchVector"`;
    const wholeWord = buildWholeWordMatch(vector);
    const pattern = buildSearchInsideWordPattern(query.query);
    const insideTitle = buildInsideWordMatch(Prisma.sql`"searchDocument"."title"`, pattern);
    const insideText = buildInsideWordMatch(Prisma.sql`"searchDocument"."extractedText"`, pattern);
    const rankExpression = buildWordRank({ insideText, insideTitle, vector, wholeWord, wordQuery: queryExpression });
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
      Prisma.sql`(${wholeWord} OR ${insideTitle} OR ${insideText})`,
      Prisma.sql`CROSS JOIN (SELECT ${query.query}::text AS "queryText") AS "input"`,
    );
    return this.prisma.$queryRaw<SearchRow[]>(sql);
  }

  /** Typo tolerance: index-backed operator with a transaction-local threshold, compared again explicitly. */
  private async findTrigramMatches(
    query: SearchQueryWithFilters,
    cursor: ReturnType<typeof decodeSearchCursor>,
  ): Promise<readonly SearchRow[]> {
    const searched = Prisma.sql`public.immutable_unaccent(${query.query})`;
    const title = Prisma.sql`public.immutable_unaccent("searchDocument"."title")`;
    const text = Prisma.sql`public.immutable_unaccent("searchDocument"."extractedText")`;
    const rankExpression = Prisma.sql`GREATEST(similarity(${title}, ${searched}), similarity(${text}, ${searched}))`;
    const sql = buildSearchSql(
      query,
      cursor,
      rankExpression,
      Prisma.sql`left(concat_ws(E'\\n', "searchDocument"."title", "searchDocument"."extractedText"), 280)`,
      Prisma.sql`(${title} % ${searched} OR ${text} % ${searched}) AND ${rankExpression} >= ${SEARCH_TRIGRAM_THRESHOLD}`,
      Prisma.empty,
    );
    const [, rows] = await this.prisma.$transaction([
      this.prisma.$queryRaw(buildTrigramThresholdSetting(SEARCH_SIMILARITY_SETTING, SEARCH_TRIGRAM_THRESHOLD)),
      this.prisma.$queryRaw<SearchRow[]>(sql),
    ]);
    return rows;
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
