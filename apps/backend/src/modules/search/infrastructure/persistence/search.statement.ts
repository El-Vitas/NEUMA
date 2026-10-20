import { PageLifecycle } from '@neuma/db';
import type { NeumaSqlTag } from '../../../../prisma/types/prisma.types';
import {
  SEARCH_ANCESTOR_DEPTH_LIMIT,
  SEARCH_HEADING_BLOCK_TYPE,
  SEARCH_INSIDE_WORD_RANK,
  SEARCH_PAGE_BLOCK_TYPE,
  SEARCH_SNIPPET_OPTIONS,
  SEARCH_TEXT_RANK_NORMALIZATION,
  SEARCH_TITLE_RANK_BONUS,
  SEARCH_TYPO_WORD_SIMILARITY_THRESHOLD,
  SEARCH_WHOLE_WORD_RANK,
} from '../../constants/search.constants';
import type { MatchExpressions, SqlFragment, SqlTemplate } from '../../types/search.sql.types';
import type { SearchCandidateQuery, SearchCandidateRequest, SearchCursorPosition } from '../../types/search.types';
import {
  buildAuthorFilter,
  buildEditedRangeFilter,
  buildSearchSpaceVisibilityFilter,
  buildTokenScopeFilter,
  buildVerifiedOnlyFilter,
} from '../../utils/search.filter.utils';
import { buildSearchInsideWordPattern } from '../../utils/search.pattern.utils';
import { allOf, asBoolean, asDouble, asJson, asText } from '../../utils/search.sql.utils';

const buildSearched = (sql: NeumaSqlTag, query: string): SqlFragment =>
  asText(sql`public.immutable_unaccent(${query}::text)`);

const buildTsQuery = (sql: NeumaSqlTag, query: string): SqlFragment =>
  asText(sql`websearch_to_tsquery('simple'::regconfig, ${buildSearched(sql, query)})`);

const buildTitleBonus = (sql: NeumaSqlTag): SqlFragment =>
  asDouble(
    sql`(CASE WHEN "block"."type" = ${SEARCH_PAGE_BLOCK_TYPE}::text THEN ${SEARCH_TITLE_RANK_BONUS}::float8 ELSE 0::float8 END)`,
  );

/** Whole words through the vector index, and inside a word through the trigram index; accents and case ignored. */
const buildWordsExpressions = (sql: NeumaSqlTag, query: string): MatchExpressions => {
  const tsQuery = buildTsQuery(sql, query);
  const pattern = buildSearchInsideWordPattern(query);
  const wholeWord = asBoolean(sql`"block"."searchVector" @@ ${tsQuery}`);
  const insideWord =
    pattern === null
      ? asBoolean(sql`FALSE`)
      : asBoolean(sql`public.immutable_unaccent("block"."text") ILIKE public.immutable_unaccent(${pattern}::text)`);
  return {
    match: asBoolean(sql`(${wholeWord} OR ${insideWord})`),
    rank: asDouble(sql`(CASE
      WHEN ${wholeWord} THEN ${SEARCH_WHOLE_WORD_RANK}::float8
        + ts_rank_cd("block"."searchVector", ${tsQuery}, ${SEARCH_TEXT_RANK_NORMALIZATION}::int4)
      ELSE ${SEARCH_INSIDE_WORD_RANK}::float8
    END + ${buildTitleBonus(sql)})::float8`),
    snippet: asText(
      sql`ts_headline('simple'::regconfig, "hitBlock"."text", ${tsQuery}, ${SEARCH_SNIPPET_OPTIONS}::text)`,
    ),
  };
};

/** Index-backed operator with a transaction-local threshold; the explicit comparison ignores database settings. */
const buildTypoExpressions = (sql: NeumaSqlTag, query: string): MatchExpressions => {
  const searched = buildSearched(sql, query);
  const text = asText(sql`public.immutable_unaccent("block"."text")`);
  const similarity = asDouble(sql`strict_word_similarity(${searched}, ${text})::float8`);
  return {
    match: asBoolean(
      sql`(${searched} <<% ${text} AND ${similarity} >= ${SEARCH_TYPO_WORD_SIMILARITY_THRESHOLD}::float8)`,
    ),
    rank: similarity,
    snippet: asText(sql`left("hitBlock"."text", 280)`),
  };
};

const buildRootFilter = (sql: NeumaSqlTag, rootPageId: string): SqlFragment =>
  asBoolean(sql`EXISTS (
    WITH RECURSIVE "up" AS (
      SELECT "start"."id", "start"."parentId", 0 AS "depth" FROM "Block" AS "start" WHERE "start"."id" = "block"."id"
      UNION ALL
      SELECT "above"."id", "above"."parentId", "up"."depth" + 1
      FROM "Block" AS "above" INNER JOIN "up" ON "above"."id" = "up"."parentId"
      WHERE "up"."depth" < ${SEARCH_ANCESTOR_DEPTH_LIMIT}::int4
    )
    SELECT 1 FROM "up" WHERE "up"."id" = ${rootPageId}::text
  )`);

const buildCursorFilter = (sql: NeumaSqlTag, cursor: SearchCursorPosition, rank: SqlFragment): SqlFragment =>
  asBoolean(sql`(
    ${rank} < ${cursor.rank}::float8
    OR (${rank} = ${cursor.rank}::float8 AND "block"."id" > ${cursor.id}::text)
  )`);

const buildHitFilters = (
  sql: NeumaSqlTag,
  request: SearchCandidateRequest,
  expressions: MatchExpressions,
): SqlFragment => {
  const { cursor, granularity, query } = request;
  const filters: SqlFragment[] = [
    expressions.match,
    asBoolean(sql`"block"."alive"`),
    asBoolean(sql`"block"."lifecycle" = ${PageLifecycle.ACTIVE}::"PageLifecycle"`),
    asBoolean(sql`"space"."workspaceId" = ${query.workspaceId}::text`),
    buildSearchSpaceVisibilityFilter(sql, query.userId, query.userRole),
  ];
  if (query.spaceId !== undefined) filters.push(asBoolean(sql`"block"."spaceId" = ${query.spaceId}::text`));
  if (query.blockType !== undefined) filters.push(asBoolean(sql`"block"."type" = ${query.blockType}::text`));
  if (query.blockType === undefined && granularity === 'block') {
    filters.push(asBoolean(sql`"block"."type" <> ${SEARCH_PAGE_BLOCK_TYPE}::text`));
  }
  if (query.editedRange !== undefined) {
    filters.push(buildEditedRangeFilter(sql, query.editedRange, asText(sql`"block"."editedAt"`)));
  }
  if (query.rootPageId !== undefined) filters.push(buildRootFilter(sql, query.rootPageId));
  if (cursor !== null && granularity === 'block') filters.push(buildCursorFilter(sql, cursor, expressions.rank));
  return allOf(sql, filters);
};

/**
 * Walks from a block to the top of the tree and keeps only what the later steps need: the nearest page, whether
 * every block on the way is alive and active, and the ancestors that declare permissions. A chain cut by the depth
 * limit never reaches a root and is dropped. It runs once per distinct parent of the matches, not once per match.
 */
const buildAncestorSummary = (sql: NeumaSqlTag): SqlFragment =>
  asText(sql`(
    WITH RECURSIVE "ancestor" AS (
      SELECT "self"."id", "self"."parentId", "self"."type", "self"."permissions",
        ("self"."alive" AND "self"."lifecycle" = ${PageLifecycle.ACTIVE}::"PageLifecycle") AS "isLive", 0 AS "depth"
      FROM "Block" AS "self" WHERE "self"."id" = "parent"."parentId"
      UNION ALL
      SELECT "above"."id", "above"."parentId", "above"."type", "above"."permissions",
        ("above"."alive" AND "above"."lifecycle" = ${PageLifecycle.ACTIVE}::"PageLifecycle"), "ancestor"."depth" + 1
      FROM "Block" AS "above" INNER JOIN "ancestor" ON "above"."id" = "ancestor"."parentId"
      WHERE "ancestor"."depth" < ${SEARCH_ANCESTOR_DEPTH_LIMIT}::int4
    )
    SELECT
      (array_agg("id" ORDER BY "depth") FILTER (WHERE "type" = ${SEARCH_PAGE_BLOCK_TYPE}::text))[1] AS "pageId",
      min("depth") FILTER (WHERE "type" = ${SEARCH_PAGE_BLOCK_TYPE}::text) AS "pageDepth",
      bool_and("isLive") AS "isLive",
      bool_or("parentId" IS NULL) AS "reachesRoot",
      coalesce(
        jsonb_agg(jsonb_build_object('id', "id", 'depth', "depth", 'permissions', "permissions") ORDER BY "depth")
          FILTER (WHERE "permissions" IS NOT NULL),
        '[]'::jsonb
      ) AS "chain"
    FROM "ancestor"
  )`);

/** Declaring ancestors of a match, its own rule first; those from its page upward are what the page's rule is. */
const buildMatchChain = (sql: NeumaSqlTag): SqlFragment =>
  asJson(sql`(CASE WHEN "hit"."permissions" IS NULL THEN coalesce("context"."chain", '[]'::jsonb)
    ELSE jsonb_build_array(jsonb_build_object('id', "hit"."id", 'depth', -1, 'permissions', "hit"."permissions"))
      || coalesce("context"."chain", '[]'::jsonb) END)`);

const buildPageChain = (sql: NeumaSqlTag): SqlFragment =>
  asJson(sql`(CASE WHEN "hit"."type" = ${SEARCH_PAGE_BLOCK_TYPE}::text THEN ${buildMatchChain(sql)}
    ELSE coalesce((
      SELECT jsonb_agg("entry" ORDER BY ("entry"->>'depth')::int)
      FROM jsonb_array_elements("context"."chain") AS "entry"
      WHERE ("entry"->>'depth')::int >= "context"."pageDepth"
    ), '[]'::jsonb) END)`);

/** The nearest rule a match falls under; matches sharing it are readable by exactly the same people. */
const buildRuleOwner = (sql: NeumaSqlTag): SqlFragment =>
  asText(sql`(CASE WHEN "hit"."permissions" IS NOT NULL THEN "hit"."id"
    ELSE coalesce("context"."chain"->0->>'id', '') END)`);

const buildPageFilters = (sql: NeumaSqlTag, query: SearchCandidateQuery): SqlFragment => {
  const filters: SqlFragment[] = [];
  if (query.tokenScope !== undefined) {
    filters.push(buildTokenScopeFilter(sql, query.tokenScope, asText(sql`"page"."id"`), asText(sql`"page"."spaceId"`)));
  }
  if (query.authorQuery !== undefined) filters.push(buildAuthorFilter(sql, query.authorQuery));
  if (query.verifiedOnly === true) filters.push(buildVerifiedOnlyFilter(sql));
  return allOf(sql, filters);
};

/**
 * Blocks: the best ones after the cursor. Pages: `scored` keeps the best match per page and rule owner, since
 * people who may read one may read all of that rule, and places a page by its best match whoever reads it; the
 * cursor is applied on the page. The reader's own rules are applied afterwards, in TypeScript.
 */
const buildRanked = (sql: NeumaSqlTag, request: SearchCandidateRequest): SqlFragment => {
  const { cursor, fetchSize, granularity } = request;
  if (granularity === 'block') {
    return asText(sql`SELECT * FROM "scored" ORDER BY "rank" DESC, "id" ASC LIMIT ${fetchSize}::int4`);
  }
  const afterCursor =
    cursor === null
      ? asBoolean(sql`TRUE`)
      : asBoolean(sql`("scored"."pageRank" < ${cursor.rank}::float8
        OR ("scored"."pageRank" = ${cursor.rank}::float8 AND "scored"."pageId" > ${cursor.id}::text))`);
  return asText(sql`SELECT "scored".* FROM "scored"
    INNER JOIN (
      SELECT DISTINCT "pageId", "pageRank" FROM "scored"
      WHERE ${afterCursor}
      ORDER BY "pageRank" DESC, "pageId" ASC
      LIMIT ${fetchSize}::int4
    ) AS "chosen" ON "chosen"."pageId" = "scored"."pageId"`);
};

const buildScored = (sql: NeumaSqlTag, request: SearchCandidateRequest): SqlFragment =>
  request.granularity === 'block'
    ? asText(sql`SELECT *, "rank" AS "pageRank" FROM "eligible"`)
    : asText(sql`SELECT "best".*, max("best"."rank") OVER (PARTITION BY "best"."pageId") AS "pageRank" FROM (
        SELECT DISTINCT ON ("pageId", "ruleOwner") * FROM "eligible"
        ORDER BY "pageId", "ruleOwner", "rank" DESC, "id" ASC
      ) AS "best"`);

/** The headings before the block among its siblings; one that declares its own permissions is never named. */
const buildHeadings = (sql: NeumaSqlTag, request: SearchCandidateRequest): SqlFragment =>
  request.granularity === 'page'
    ? asJson(sql`'[]'::jsonb`)
    : asJson(sql`(
        SELECT coalesce(jsonb_agg(
          jsonb_build_object(
            'level', CASE WHEN jsonb_typeof("heading"."properties"->'level') = 'number'
              THEN ("heading"."properties"->>'level')::int ELSE 1 END,
            'text', "heading"."text"
          ) ORDER BY "sibling"."position"
        ), '[]'::jsonb)
        FROM "Block" AS "container"
        CROSS JOIN LATERAL unnest("container"."children") WITH ORDINALITY AS "sibling"("childId", "position")
        INNER JOIN "Block" AS "heading" ON "heading"."id" = "sibling"."childId"
          AND "heading"."type" = ${SEARCH_HEADING_BLOCK_TYPE}::text
          AND "heading"."alive"
          AND "heading"."permissions" IS NULL
        WHERE "container"."id" = "hitBlock"."parentId"
          AND "sibling"."position" < array_position("container"."children", "hitBlock"."id")
      )`);

const buildOrder = (sql: NeumaSqlTag, request: SearchCandidateRequest): SqlFragment =>
  request.granularity === 'page'
    ? asText(sql`ORDER BY "ranked"."pageRank" DESC, "ranked"."pageId" ASC, "ranked"."rank" DESC, "ranked"."id" ASC`)
    : asText(sql`ORDER BY "ranked"."rank" DESC, "ranked"."id" ASC`);

/**
 * One statement per page of results, with no cap on the matches it looks at. `hits` finds the matching blocks
 * through the indexes; `context` summarises the ancestors once per distinct parent of those; `eligible` keeps the
 * live ones with their page; `scored` and `ranked` take one page of them, and only then are the page, the space, the
 * snippet and the headings read.
 */
export const buildCandidateStatement = (sql: NeumaSqlTag, request: SearchCandidateRequest): SqlTemplate => {
  const { matching, query } = request;
  const expressions =
    matching === 'words' ? buildWordsExpressions(sql, query.query) : buildTypoExpressions(sql, query.query);
  return sql`
    WITH "hits" AS (
      SELECT "block"."id", "block"."parentId", "block"."type", "block"."permissions",
        ${expressions.rank} AS "rank"
      FROM "Block" AS "block"
      INNER JOIN "Space" AS "space" ON "space"."id" = "block"."spaceId"
      WHERE ${buildHitFilters(sql, request, expressions)}
    ),
    "context" AS MATERIALIZED (
      SELECT "parent"."parentId" AS "id", "summary".*
      FROM (SELECT DISTINCT "parentId" FROM "hits" WHERE "parentId" IS NOT NULL) AS "parent"
      CROSS JOIN LATERAL ${buildAncestorSummary(sql)} AS "summary"
    ),
    "eligible" AS (
      SELECT "hit"."id", "hit"."rank",
        (CASE WHEN "hit"."type" = ${SEARCH_PAGE_BLOCK_TYPE}::text THEN "hit"."id" ELSE "context"."pageId" END) AS "pageId",
        ${buildMatchChain(sql)} AS "chain",
        ${buildPageChain(sql)} AS "pageChain",
        ${buildRuleOwner(sql)} AS "ruleOwner"
      FROM "hits" AS "hit"
      LEFT JOIN "context" ON "context"."id" = "hit"."parentId"
      INNER JOIN "Block" AS "page"
        ON "page"."id" = (CASE WHEN "hit"."type" = ${SEARCH_PAGE_BLOCK_TYPE}::text THEN "hit"."id" ELSE "context"."pageId" END)
      WHERE ("hit"."parentId" IS NULL OR ("context"."isLive" AND "context"."reachesRoot"))
        AND ${buildPageFilters(sql, query)}
    ),
    "scored" AS (
      ${buildScored(sql, request)}
    ),
    "ranked" AS (
      ${buildRanked(sql, request)}
    )
    SELECT
      "ranked"."id" AS "blockId",
      "ranked"."pageId",
      "ranked"."rank",
      "ranked"."pageRank",
      "ranked"."chain",
      "ranked"."pageChain",
      "hitBlock"."type" AS "blockType",
      ${expressions.snippet} AS "snippet",
      "hitBlock"."spaceId",
      "space"."name" AS "spaceName",
      "page"."text" AS "pageTitle",
      "page"."format"->'icon' AS "icon",
      "page"."parentId" AS "pageParentId",
      "parent"."text" AS "parentPageTitle",
      ${buildVerifiedOnlyFilter(sql)} AS "isPageVerified",
      GREATEST("hitBlock"."editedAt", "page"."editedAt") AS "editedAt",
      ${buildHeadings(sql, request)} AS "headings"
    FROM "ranked"
    INNER JOIN "Block" AS "hitBlock" ON "hitBlock"."id" = "ranked"."id"
    INNER JOIN "Block" AS "page" ON "page"."id" = "ranked"."pageId"
    INNER JOIN "Space" AS "space" ON "space"."id" = "hitBlock"."spaceId"
    LEFT JOIN "Block" AS "parent" ON "parent"."id" = "page"."parentId" AND "parent"."type" = ${SEARCH_PAGE_BLOCK_TYPE}::text
    ${buildOrder(sql, request)}
  `;
};
