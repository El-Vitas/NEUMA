import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { type NeumaTransaction, SearchIndexingState, SpaceVisibility } from '@neuma/db';
import type { UserRole } from '@neuma/shared';
import { SEARCH_MAX_LIMIT, SEARCH_SOURCE_TYPE_VALUES } from '../../../../common/constants/search.constants';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { canReadSpace } from '../../../../common/domain/workspace.domain';
import type { SearchSourceType, SearchTokenScope } from '../../../../common/types/search.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildSqlTextList } from '../../../../prisma/prisma.sql.lib';
import type { NeumaSqlTag } from '../../../../prisma/types/prisma.types';
import {
  SEARCH_INSIDE_TEXT_RANK,
  SEARCH_INSIDE_TITLE_RANK,
  SEARCH_SIMILARITY_SETTING,
  SEARCH_TEXT_RANK_NORMALIZATION,
  SEARCH_TRIGRAM_THRESHOLD,
  SEARCH_WHOLE_WORD_RANK,
} from '../../constants/search.constants';
import type { SearchCursorFilter, SearchExpressions, SqlFragment } from '../../types/search.sql.types';
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
import { allOf, asBoolean, asReal, asText } from '../../utils/search.sql.utils';

const buildSearchConfig = (sql: NeumaSqlTag): SqlFragment =>
  asText(sql`CASE "searchDocument"."language"
  WHEN 'en' THEN 'english'::regconfig
  WHEN 'es' THEN 'spanish'::regconfig
  ELSE 'simple'::regconfig
END`);

const buildQueryIn = (sql: NeumaSqlTag, config: SqlFragment): SqlFragment =>
  asText(sql`websearch_to_tsquery(${config}, public.immutable_unaccent("input"."queryText"))`);

const buildQueryExpression = (sql: NeumaSqlTag): SqlFragment => buildQueryIn(sql, buildSearchConfig(sql));

/**
 * One branch per language with a fixed config: a config read from a column cannot use the vector index.
 * Languages match those used to build the vector.
 */
const buildWholeWordMatch = (sql: NeumaSqlTag, vector: SqlFragment): SqlFragment =>
  asBoolean(sql`(
  ("searchDocument"."language" = 'en' AND ${vector} @@ ${buildQueryIn(sql, asText(sql`'english'::regconfig`))})
  OR ("searchDocument"."language" = 'es' AND ${vector} @@ ${buildQueryIn(sql, asText(sql`'spanish'::regconfig`))})
  OR (
    "searchDocument"."language" IS DISTINCT FROM 'en'
    AND "searchDocument"."language" IS DISTINCT FROM 'es'
    AND ${vector} @@ ${buildQueryIn(sql, asText(sql`'simple'::regconfig`))}
  )
)`);

/** Transaction-local, so pg_trgm operators use the index with this threshold. */
export const setTrigramThreshold = async (
  transaction: NeumaTransaction,
  sql: NeumaSqlTag,
  setting: string,
  threshold: number,
): Promise<void> => {
  await transaction.execute(sql`SELECT set_config(${setting}, ${String(threshold)}, true)`.affectedCount().build());
};

/** Accent- and case-insensitive; a null pattern (query too short) never matches. */
export const buildInsideWordMatch = (sql: NeumaSqlTag, column: SqlFragment, pattern: string | null): SqlFragment =>
  pattern === null
    ? asBoolean(sql`FALSE`)
    : asBoolean(sql`public.immutable_unaccent(${column}) ILIKE public.immutable_unaccent(${pattern})`);

/** Tiers: whole word first (most similar first), then inside a title word, then inside a text word. */
export const buildWordRank = (
  sql: NeumaSqlTag,
  matches: {
    readonly insideText: SqlFragment;
    readonly insideTitle: SqlFragment;
    readonly vector: SqlFragment;
    readonly wholeWord: SqlFragment;
    readonly wordQuery: SqlFragment;
  },
): SqlFragment => {
  const { insideText, insideTitle, vector, wholeWord, wordQuery } = matches;
  return asReal(sql`(CASE
    WHEN ${wholeWord} THEN ${SEARCH_WHOLE_WORD_RANK} + ts_rank_cd(${vector}, ${wordQuery}, ${SEARCH_TEXT_RANK_NORMALIZATION})
    WHEN ${insideTitle} THEN ${SEARCH_INSIDE_TITLE_RANK}
    WHEN ${insideText} THEN ${SEARCH_INSIDE_TEXT_RANK}
    ELSE 0
  END)::real`);
};

const readSourceType = (value: string): SearchSourceType => {
  const sourceType = SEARCH_SOURCE_TYPE_VALUES.find((candidate) => candidate === value);
  if (sourceType === undefined) throw new Error(`Search document has an unknown source type: ${value}`);
  return sourceType;
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
  sourceType: readSourceType(row.sourceType),
  snippet: row.snippet,
  title: row.title,
  updatedAt: row.updatedAt.toISOString(),
});

const buildSearchSql = (
  prisma: PrismaService,
  query: SearchQueryWithFilters,
  cursor: SearchCursorFilter,
  expressions: SearchExpressions,
) => {
  const { sql } = prisma;
  const { columns } = prisma.tables.SearchDocument;
  const filters = buildFilters(sql, query, cursor, expressions.rank);
  return sql`
    SELECT
      "searchDocument"."contentType",
      "searchDocument"."properties"->'icon' AS "icon",
      "searchDocument"."properties"->>'parentPageId' AS "parentPageId",
      "searchDocument"."properties"->>'parentPageTitle' AS "parentPageTitle",
      ${expressions.rank} AS "rank",
      ${expressions.snippet} AS "snippet",
      ${buildDocumentIsVerified(sql)} AS "isVerified",
      "searchDocument"."sourceId",
      "searchDocument"."sourceType",
      "searchDocument"."spaceId",
      "searchDocument"."properties"->>'spaceName' AS "spaceName",
      "searchDocument"."title",
      "searchDocument"."updatedAt"
    FROM "SearchDocument" AS "searchDocument"
    INNER JOIN "Space" AS "space" ON "space"."id" = "searchDocument"."spaceId"
    ${expressions.queryInput}
    WHERE "searchDocument"."indexingState" = ${SearchIndexingState.INDEXED}::"SearchIndexingState"
      AND ${expressions.match}
      AND "space"."workspaceId" = ${query.workspaceId}
      AND ${buildSearchSpaceVisibilityFilter(sql, query.userId, query.userRole)}
      AND ${filters}
    ORDER BY "rank" DESC, "searchDocument"."updatedAt" DESC, "searchDocument"."sourceId" ASC
    LIMIT ${Math.min(query.limit + 1, SEARCH_MAX_LIMIT + 1)}
  `
    .returnsRow({
      contentType: columns.contentType,
      icon: { codecId: 'pg/jsonb@1', nullable: true },
      isVerified: 'pg/bool@1',
      parentPageId: { codecId: 'pg/text@1', nullable: true },
      parentPageTitle: { codecId: 'pg/text@1', nullable: true },
      rank: 'pg/float4@1',
      snippet: 'pg/text@1',
      sourceId: columns.sourceId,
      sourceType: 'pg/text@1',
      spaceId: columns.spaceId,
      spaceName: { codecId: 'pg/text@1', nullable: true },
      title: columns.title,
      updatedAt: 'pg/timestamptz-date@1',
    })
    .build();
};

const buildEditedRangeInterval = (sql: NeumaSqlTag, range: SearchEditedRange): SqlFragment => {
  switch (range) {
    case 'LAST_MONTH':
      return asText(sql`now() - interval '30 days'`);
    case 'LAST_SEVEN_DAYS':
      return asText(sql`now() - interval '7 days'`);
    case 'THIS_YEAR':
      return asText(sql`date_trunc('year', now())`);
    default:
      return asText(sql`date_trunc('day', now())`);
  }
};

/**
 * Mirrors `buildSpaceVisibilityFilter`, duplicated because raw SQL cannot take an ORM filter.
 * Each role condition stays inside its own visibility branch: a bare TRUE alternative would make
 * every other one moot and expose private spaces.
 */
export const buildSearchSpaceVisibilityFilter = (sql: NeumaSqlTag, userId: string, role: UserRole): SqlFragment => {
  const belongsToTheReader = asBoolean(sql`EXISTS (
    SELECT 1 FROM "SpaceMember" AS "spaceMember"
    WHERE "spaceMember"."spaceId" = "space"."id" AND "spaceMember"."userId" = ${userId}
  )`);
  const readsEveryRestrictedSpace = canReadSpace(role, SpaceVisibility.RESTRICTED, false);
  const restrictedReadAccess = readsEveryRestrictedSpace ? asBoolean(sql`TRUE`) : belongsToTheReader;

  return asBoolean(sql`(
    "space"."visibility" = ${SpaceVisibility.PUBLIC_INTERNAL}::"SpaceVisibility"
    OR (
      "space"."visibility" = ${SpaceVisibility.RESTRICTED}::"SpaceVisibility"
      AND ${restrictedReadAccess}
    )
    OR (
      "space"."visibility" = ${SpaceVisibility.PRIVATE}::"SpaceVisibility"
      AND ("space"."ownerId" = ${userId} OR ${belongsToTheReader})
    )
  )`);
};

export const buildEditedRangeFilter = (
  sql: NeumaSqlTag,
  range: SearchEditedRange,
  updatedAtColumn: SqlFragment = asText(sql`"searchDocument"."updatedAt"`),
): SqlFragment => asBoolean(sql`${updatedAtColumn} >= ${buildEditedRangeInterval(sql, range)}`);

/** Evaluated against `now()` at query time, so an expired verification stops matching without a rewrite. */
const buildDocumentIsVerified = (sql: NeumaSqlTag): SqlFragment =>
  asBoolean(sql`(
  "searchDocument"."properties"->>'verifiedAt' IS NOT NULL
  AND (
    "searchDocument"."properties"->>'verificationExpiresAt' IS NULL
    OR ("searchDocument"."properties"->>'verificationExpiresAt')::timestamptz > now()
  )
)`);

export const buildVerifiedOnlyFilter = (sql: NeumaSqlTag): SqlFragment => buildDocumentIsVerified(sql);

const buildSpaceLevelTokenFilter = (
  sql: NeumaSqlTag,
  scope: SearchTokenScope,
  spaceColumn: SqlFragment,
): SqlFragment =>
  scope.readsEverywhere
    ? asBoolean(sql`NOT ${spaceColumn} = ANY(${buildSqlTextList(sql, scope.closedSpaceIds)})`)
    : asBoolean(sql`${spaceColumn} = ANY(${buildSqlTextList(sql, scope.openSpaceIds)})`);

/**
 * Same rule as reading: a page with its own or inherited rule follows it, the rest follow their
 * space's rule. Added to the user's visibility, never replacing it. Columns are parameters because
 * pages and blocks are both searched.
 */
export const buildTokenScopeFilter = (
  sql: NeumaSqlTag,
  scope: SearchTokenScope,
  pageColumn: SqlFragment,
  spaceColumn: SqlFragment,
): SqlFragment =>
  asBoolean(sql`(
  ${pageColumn} = ANY(${buildSqlTextList(sql, scope.allowedPageIds)})
  OR (
    NOT ${pageColumn} = ANY(${buildSqlTextList(sql, scope.closedPageIds)})
    AND ${buildSpaceLevelTokenFilter(sql, scope, spaceColumn)}
  )
)`);

const buildCursorFilter = (
  sql: NeumaSqlTag,
  cursor: NonNullable<SearchCursorFilter>,
  rankExpression: SqlFragment,
): SqlFragment =>
  asBoolean(sql`(
      ${rankExpression} < ${cursor.rank}
      OR (${rankExpression} = ${cursor.rank} AND "searchDocument"."updatedAt" < ${cursor.updatedAt}::timestamptz)
      OR (${rankExpression} = ${cursor.rank} AND "searchDocument"."updatedAt" = ${cursor.updatedAt}::timestamptz
        AND "searchDocument"."sourceId" > ${cursor.sourceId})
    )`);

const buildFilters = (
  sql: NeumaSqlTag,
  query: SearchQueryWithFilters,
  cursor: SearchCursorFilter,
  rankExpression: SqlFragment,
): SqlFragment => {
  const filters: SqlFragment[] = [];
  if (query.spaceId !== undefined) filters.push(asBoolean(sql`"searchDocument"."spaceId" = ${query.spaceId}`));
  if (query.tokenScope !== undefined)
    filters.push(
      buildTokenScopeFilter(
        sql,
        query.tokenScope,
        asText(sql`"searchDocument"."sourceId"`),
        asText(sql`"searchDocument"."spaceId"`),
      ),
    );
  if (query.sourceType !== undefined)
    filters.push(asBoolean(sql`"searchDocument"."sourceType" = ${query.sourceType}::"SearchSourceType"`));
  if (query.contentType !== undefined)
    filters.push(asBoolean(sql`"searchDocument"."contentType" = ${query.contentType}`));
  if (query.tags !== undefined && query.tags.length > 0)
    filters.push(asBoolean(sql`"searchDocument"."tags" @> ${JSON.stringify(query.tags)}::jsonb`));
  if (query.authorQuery !== undefined)
    filters.push(
      asBoolean(
        sql`"searchDocument"."properties"->>'authorName' ILIKE ${buildSearchAnywherePattern(query.authorQuery)}`,
      ),
    );
  if (query.editedRange !== undefined) filters.push(buildEditedRangeFilter(sql, query.editedRange));
  if (query.verifiedOnly === true) filters.push(buildVerifiedOnlyFilter(sql));
  if (cursor !== null) filters.push(buildCursorFilter(sql, cursor, rankExpression));
  return allOf(sql, filters);
};

const buildLanguageValue = (sql: NeumaSqlTag, language: SearchDocumentInput['language']): SqlFragment =>
  language === null ? asText(sql`NULL::text`) : asText(sql`${language}::text`);

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertDocument(input: SearchDocumentInput): Promise<void> {
    const { sql } = this.prisma;
    await this.prisma.runner.execute(
      sql`
      INSERT INTO "SearchDocument" (
        "id", "sourceType", "sourceId", "spaceId", "title", "extractedText", "language",
        "tags", "properties", "contentType", "versionMarker", "indexingState", "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${input.sourceType}::"SearchSourceType", ${input.sourceId}, ${input.spaceId}, ${input.title},
        ${input.extractedText}, ${buildLanguageValue(sql, input.language)}, ${JSON.stringify(input.tags)}::jsonb,
        ${JSON.stringify(input.properties)}::jsonb, ${input.contentType}, ${input.versionMarker},
        ${SearchIndexingState.INDEXED}::"SearchIndexingState", now(), ${input.editedAt.toISOString()}::timestamptz
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
    `
        .affectedCount()
        .build(),
    );
  }

  async removeDocument(input: SearchDocumentRemoval): Promise<void> {
    await this.prisma.models.SearchDocument.where({ sourceId: input.sourceId, sourceType: input.sourceType })
      .where((document) => document.versionMarker.lte(input.versionMarker))
      .deleteAndCount();
  }

  async search(query: SearchQueryWithFilters): Promise<SearchPageWithContext> {
    const cursor = decodeSearchCursor(query.cursor);
    const rows = await this.findFullTextMatches(query, cursor);
    const usefulRows = rows.length > 0 ? rows : await this.findTrigramMatches(query, cursor);
    return this.toSearchPage(usefulRows, query.limit);
  }

  private async findFullTextMatches(
    query: SearchQueryWithFilters,
    cursor: SearchCursorFilter,
  ): Promise<readonly SearchRow[]> {
    const { sql } = this.prisma;
    const vector = asText(sql`"searchDocument"."searchVector"`);
    const wholeWord = buildWholeWordMatch(sql, vector);
    const pattern = buildSearchInsideWordPattern(query.query);
    const insideTitle = buildInsideWordMatch(sql, asText(sql`"searchDocument"."title"`), pattern);
    const insideText = buildInsideWordMatch(sql, asText(sql`"searchDocument"."extractedText"`), pattern);
    const queryExpression = buildQueryExpression(sql);
    const rank = buildWordRank(sql, { insideText, insideTitle, vector, wholeWord, wordQuery: queryExpression });
    return this.prisma.runner.query(
      buildSearchSql(this.prisma, query, cursor, {
        match: asBoolean(sql`(${wholeWord} OR ${insideTitle} OR ${insideText})`),
        queryInput: asText(sql`CROSS JOIN (SELECT ${query.query}::text AS "queryText") AS "input"`),
        rank,
        snippet: asText(sql`ts_headline(
        ${buildSearchConfig(sql)},
        concat_ws(E'\\n', "searchDocument"."title", "searchDocument"."extractedText"),
        ${queryExpression},
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=30,MinWords=8'
      )`),
      }),
    );
  }

  /** Typo tolerance: index-backed operator with a transaction-local threshold, compared again explicitly. */
  private async findTrigramMatches(
    query: SearchQueryWithFilters,
    cursor: SearchCursorFilter,
  ): Promise<readonly SearchRow[]> {
    const { sql } = this.prisma;
    const searched = asText(sql`public.immutable_unaccent(${query.query})`);
    const title = asText(sql`public.immutable_unaccent("searchDocument"."title")`);
    const text = asText(sql`public.immutable_unaccent("searchDocument"."extractedText")`);
    const rank = asReal(sql`GREATEST(similarity(${title}, ${searched}), similarity(${text}, ${searched}))`);
    const statement = buildSearchSql(this.prisma, query, cursor, {
      match: asBoolean(
        sql`(${title} % ${searched} OR ${text} % ${searched}) AND ${rank} >= ${SEARCH_TRIGRAM_THRESHOLD}`,
      ),
      queryInput: asText(sql``),
      rank,
      snippet: asText(sql`left(concat_ws(E'\\n', "searchDocument"."title", "searchDocument"."extractedText"), 280)`),
    });
    return this.prisma.transaction(async (transaction) => {
      await setTrigramThreshold(transaction, sql, SEARCH_SIMILARITY_SETTING, SEARCH_TRIGRAM_THRESHOLD);
      return transaction.query(statement);
    });
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
