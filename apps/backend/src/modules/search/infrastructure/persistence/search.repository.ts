import { randomUUID } from 'node:crypto';
import { SearchIndexingState, SpaceVisibility } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
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
 * Si un documento tiene lo buscado como palabra entera, leído en su idioma.
 *
 * Va en un tramo por idioma, cada uno con su configuración fija: una consulta
 * cuya configuración sale de una columna de cada fila no puede usar el índice
 * del vector y recorre la tabla entera. Así cada tramo usa el índice, y los
 * tramos se juntan. Los idiomas son los mismos con que se arma el vector.
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

/** Fija un umbral de pg_trgm solo para la transacción en curso, para que sus operadores usen el índice con ese umbral. */
export const buildTrigramThresholdSetting = (setting: string, threshold: number): Prisma.Sql =>
  Prisma.sql`SELECT set_config(${setting}, ${String(threshold)}, true)`;

/**
 * Si una columna tiene lo buscado dentro de alguna palabra, sin mirar tildes
 * ni mayúsculas. Sin patrón —lo buscado es muy corto—, nunca.
 */
export const buildInsideWordMatch = (column: Prisma.Sql, pattern: string | null): Prisma.Sql =>
  pattern === null
    ? Prisma.sql`FALSE`
    : Prisma.sql`public.immutable_unaccent(${column}) ILIKE public.immutable_unaccent(${pattern})`;

/**
 * El orden de lo encontrado, en escalones: palabra entera primero (y entre
 * ellas, la más parecida), después dentro de una palabra del título, y al
 * final dentro de una palabra del texto.
 */
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

/** Lo editado desde el comienzo del período; la columna es la de la página o la de su copia en el índice. */
export const buildEditedRangeFilter = (
  range: SearchEditedRange,
  updatedAtColumn: Prisma.Sql = Prisma.sql`"searchDocument"."updatedAt"`,
): Prisma.Sql => Prisma.sql`AND ${updatedAtColumn} >= ${buildEditedRangeInterval(range)}`;

/**
 * Only pages currently valid: verified, and either with no expiration or one
 * still in the future. Checked against `now()` at query time rather than a
 * flag baked in at projection time, so a page does not keep reading as
 * verified past its own expiration just because nobody has written in it since.
 */
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
 * Lo que un token deja encontrar, con la misma regla que decide al leer: una
 * página con regla de página propia o heredada la sigue; las demás siguen la
 * regla de su espacio, o la de todos. Se suma a la visibilidad de la persona,
 * nunca la reemplaza.
 *
 * Se le dice qué columna nombra la página y cuál el espacio, porque se busca
 * tanto en páginas como en bloques, y un bloque sigue la regla de su página.
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

  /** Lo que tiene lo buscado como palabra entera o dentro de una palabra más larga, ordenado por `buildWordRank`. */
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

  /**
   * Las páginas parecidas a lo buscado, para perdonar un error de tipeo. El
   * operador usa el índice de trigramas con el umbral fijado solo para esta
   * transacción; la comparación con el umbral queda escrita igual.
   */
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
