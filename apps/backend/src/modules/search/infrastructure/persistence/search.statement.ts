import { PageLifecycle } from '@neuma/db';
import { BLOCK_TYPE } from '@neuma/shared';
import type { NeumaSqlTag } from '../../../../prisma/types/prisma.types';
import {
  SEARCH_ANCESTOR_DEPTH_LIMIT,
  SEARCH_HEADING_BLOCK_TYPE,
  SEARCH_INSIDE_WORD_RANK,
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
    sql`(CASE WHEN "block"."type" = ${BLOCK_TYPE.page}::text THEN ${SEARCH_TITLE_RANK_BONUS}::float8 ELSE 0::float8 END)`,
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

const buildMatchExpressions = (sql: NeumaSqlTag, request: SearchCandidateRequest): MatchExpressions =>
  request.matching === 'words'
    ? buildWordsExpressions(sql, request.query.query)
    : buildTypoExpressions(sql, request.query.query);

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

/** The page and all that hangs from it, walked down once, so it is out before any match is ranked or counted. */
const buildOutsideBranchFilter = (sql: NeumaSqlTag, pageId: string): SqlFragment =>
  asBoolean(sql`"block"."id" NOT IN (
    WITH RECURSIVE "branch" AS (
      SELECT "root"."id", 0 AS "depth" FROM "Block" AS "root" WHERE "root"."id" = ${pageId}::text
      UNION ALL
      SELECT "child"."id", "branch"."depth" + 1
      FROM "Block" AS "child" INNER JOIN "branch" ON "child"."parentId" = "branch"."id"
      WHERE "branch"."depth" < ${SEARCH_ANCESTOR_DEPTH_LIMIT}::int4
    )
    SELECT "id" FROM "branch"
  )`);

const buildCursorFilter = (sql: NeumaSqlTag, cursor: SearchCursorPosition, rank: SqlFragment): SqlFragment =>
  asBoolean(sql`(
    ${rank} < ${cursor.rank}::float8
    OR (${rank} = ${cursor.rank}::float8 AND "block"."id" > ${cursor.id}::text)
  )`);

/**
 * The spaces of the workspace the reader may see, resolved once and compared as a list. A join with the spaces makes
 * the planner scan space by space on one core; a list lets it split the scan of the blocks across several.
 */
const buildReadableSpaceFilter = (sql: NeumaSqlTag, query: SearchCandidateQuery): SqlFragment =>
  asBoolean(sql`"block"."spaceId" = ANY (ARRAY(
    SELECT "space"."id" FROM "Space" AS "space"
    WHERE "space"."workspaceId" = ${query.workspaceId}::text
      AND ${buildSearchSpaceVisibilityFilter(sql, query.userId, query.userRole)}
  ))`);

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
    buildReadableSpaceFilter(sql, query),
  ];
  if (query.spaceId !== undefined) filters.push(asBoolean(sql`"block"."spaceId" = ${query.spaceId}::text`));
  if (query.blockType !== undefined) filters.push(asBoolean(sql`"block"."type" = ${query.blockType}::text`));
  if (query.blockType === undefined && granularity === 'block') {
    filters.push(asBoolean(sql`"block"."type" <> ${BLOCK_TYPE.page}::text`));
  }
  if (query.editedRange !== undefined) {
    filters.push(buildEditedRangeFilter(sql, query.editedRange, asText(sql`"block"."editedAt"`)));
  }
  if (query.rootPageId !== undefined) filters.push(buildRootFilter(sql, query.rootPageId));
  if (query.excludedBranchPageId !== undefined) filters.push(buildOutsideBranchFilter(sql, query.excludedBranchPageId));
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
      (array_agg("id" ORDER BY "depth") FILTER (WHERE "type" = ${BLOCK_TYPE.page}::text))[1] AS "pageId",
      min("depth") FILTER (WHERE "type" = ${BLOCK_TYPE.page}::text) AS "pageDepth",
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
  asJson(sql`(CASE WHEN "hit"."type" = ${BLOCK_TYPE.page}::text THEN ${buildMatchChain(sql)}
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
  const filters: SqlFragment[] = [asBoolean(sql`"page"."properties" -> 'template' IS NULL`)];
  if (query.tokenScope !== undefined) {
    filters.push(buildTokenScopeFilter(sql, query.tokenScope, asText(sql`"page"."id"`), asText(sql`"page"."spaceId"`)));
  }
  if (query.authorQuery !== undefined) filters.push(buildAuthorFilter(sql, query.authorQuery));
  if (query.verifiedOnly === true) filters.push(buildVerifiedOnlyFilter(sql));
  return allOf(sql, filters);
};

/**
 * Blocks: `scored` is each match on its own. Pages: it keeps the best match per page and rule owner, since people
 * who may read one may read all of that rule, and places a page by its best match whoever reads it. The reader's
 * own rules are applied afterwards, in TypeScript.
 */
const buildScored = (sql: NeumaSqlTag, request: SearchCandidateRequest): SqlFragment =>
  request.granularity === 'block'
    ? asText(sql`SELECT *, "rank" AS "pageRank", "id" AS "pageBestId" FROM "eligible"`)
    : asText(sql`SELECT "best".*,
        max("best"."rank") OVER (PARTITION BY "best"."pageId") AS "pageRank",
        first_value("best"."id") OVER (
          PARTITION BY "best"."pageId" ORDER BY "best"."rank" DESC, "best"."id" ASC
        ) AS "pageBestId"
      FROM (
        SELECT DISTINCT ON ("pageId", "ruleOwner") * FROM "eligible"
        ORDER BY "pageId", "ruleOwner", "rank" DESC, "id" ASC
      ) AS "best"`);

const buildRanked = (sql: NeumaSqlTag, request: SearchCandidateRequest): SqlFragment =>
  request.granularity === 'block'
    ? asText(sql`SELECT * FROM "scored" ORDER BY "rank" DESC, "id" ASC LIMIT ${request.fetchSize}::int4`)
    : asText(sql`SELECT * FROM "scored"`);

/** The page a match belongs to: itself when it is one, otherwise the nearest page above it. */
const buildPageOf = (sql: NeumaSqlTag): SqlFragment =>
  asText(sql`(CASE WHEN "hit"."type" = ${BLOCK_TYPE.page}::text THEN "hit"."id" ELSE "context"."pageId" END)`);

/** The ancestors of the parents of the given matches, summarised once per distinct parent. */
const buildContext = (sql: NeumaSqlTag, hits: SqlFragment): SqlFragment =>
  asText(sql`SELECT "parent"."parentId" AS "id", "summary".*
    FROM (SELECT DISTINCT "parentId" FROM ${hits} AS "walked" WHERE "parentId" IS NOT NULL) AS "parent"
    CROSS JOIN LATERAL ${buildAncestorSummary(sql)} AS "summary"`);

const buildHitColumns = (sql: NeumaSqlTag, expressions: MatchExpressions): SqlFragment =>
  asText(sql`"block"."id", "block"."parentId", "block"."type", "block"."permissions", ${expressions.rank} AS "rank"`);

/**
 * The best matches in rank order, with nothing else known about them yet. Only these go on to have their ancestors
 * walked; for pages the rank is the whole story, so it starts at the best match whatever the cursor says.
 */
const buildWindow = (
  sql: NeumaSqlTag,
  request: SearchCandidateRequest,
  expressions: MatchExpressions,
  windowSize: number,
): SqlFragment =>
  asText(sql`SELECT ${buildHitColumns(sql, expressions)}
    FROM "Block" AS "block"
    WHERE ${buildHitFilters(sql, request, expressions)}
    ORDER BY "rank" DESC, "block"."id" ASC
    LIMIT ${windowSize}::int4`);

/** Pages, second step: every match inside the chosen pages, whatever its rank, to know who may read the page. */
const buildContentHits = (
  sql: NeumaSqlTag,
  request: SearchCandidateRequest,
  expressions: MatchExpressions,
): SqlFragment =>
  asText(sql`SELECT ${buildHitColumns(sql, expressions)}
    FROM "Block" AS "block"
    WHERE "block"."id" IN (SELECT "id" FROM "contents") AND ${buildHitFilters(sql, request, expressions)}`);

const buildHitSteps = (
  sql: NeumaSqlTag,
  request: SearchCandidateRequest,
  expressions: MatchExpressions,
  windowSize: number,
): SqlFragment =>
  request.granularity === 'block'
    ? asText(sql`"hits" AS (${buildWindow(sql, request, expressions, windowSize)})`)
    : asText(sql`"window" AS (${buildWindow(sql, request, expressions, windowSize)}),
      "windowContext" AS MATERIALIZED (${buildContext(sql, asText(sql`"window"`))}),
      "chosen" AS (${buildChosenPages(sql, request)}),
      "contents" AS (${buildPageContents(sql)}),
      "hits" AS (${buildContentHits(sql, request, expressions)})`);

/**
 * Pages, first step: the pages of the window's live matches, each placed by its best match, then the ones after
 * the cursor. A page's rank is the best of its matches, and every better match is in the window, so the rank and
 * the order are exact; the matches of a page below the window are fetched next, for the pages chosen only.
 */
const buildChosenPages = (sql: NeumaSqlTag, request: SearchCandidateRequest): SqlFragment => {
  const { cursor, fetchSize, query } = request;
  const afterCursor =
    cursor === null
      ? asBoolean(sql`TRUE`)
      : asBoolean(sql`("placed"."pageRank" < ${cursor.rank}::float8
        OR ("placed"."pageRank" = ${cursor.rank}::float8 AND "placed"."pageBestId" > ${cursor.id}::text))`);
  return asText(sql`SELECT "placed"."pageId" FROM (
      SELECT "live"."pageId", max("live"."rank") AS "pageRank",
        (array_agg("live"."id" ORDER BY "live"."rank" DESC, "live"."id" ASC))[1] AS "pageBestId"
      FROM (
        SELECT "hit"."id", "hit"."rank", ${buildPageOf(sql)} AS "pageId"
        FROM "window" AS "hit"
        LEFT JOIN "windowContext" AS "context" ON "context"."id" = "hit"."parentId"
        INNER JOIN "Block" AS "page" ON "page"."id" = ${buildPageOf(sql)}
        WHERE ("hit"."parentId" IS NULL OR ("context"."isLive" AND "context"."reachesRoot"))
          AND ${buildPageFilters(sql, query)}
      ) AS "live"
      GROUP BY "live"."pageId"
    ) AS "placed"
    WHERE ${afterCursor}
    ORDER BY "placed"."pageRank" DESC, "placed"."pageBestId" ASC
    LIMIT ${fetchSize}::int4`);
};

/** Everything a page holds that is not another page: the blocks whose nearest page it is. */
const buildPageContents = (sql: NeumaSqlTag): SqlFragment =>
  asText(sql`WITH RECURSIVE "down" AS (
      SELECT "chosen"."pageId" AS "id", 0 AS "depth" FROM "chosen"
      UNION ALL
      SELECT "child"."id", "down"."depth" + 1
      FROM "Block" AS "child" INNER JOIN "down" ON "child"."parentId" = "down"."id"
      WHERE "child"."type" <> ${BLOCK_TYPE.page}::text AND "down"."depth" < ${SEARCH_ANCESTOR_DEPTH_LIMIT}::int4
    )
    SELECT "id" FROM "down"`);

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
    ? asText(sql`ORDER BY "ranked"."pageRank" DESC, "ranked"."pageBestId" ASC, "ranked"."rank" DESC, "ranked"."id" ASC`)
    : asText(sql`ORDER BY "ranked"."rank" DESC, "ranked"."id" ASC`);

/**
 * One statement per page of results. Only the best matches, a window of them, have their ancestors walked, so a
 * word found in every page costs what a rare one does; the caller widens the window when too few survive. `hits`
 * is the matches the later steps work on (for pages, all those inside the pages the window chose); `context`
 * summarises their ancestors once per distinct parent; `eligible` keeps the live ones with their page; `scored` and
 * `ranked` take one page of them, and only then are the page, the space, the snippet and the headings read.
 */
export const buildCandidateStatement = (
  sql: NeumaSqlTag,
  request: SearchCandidateRequest,
  windowSize: number,
): SqlTemplate => {
  const { query } = request;
  const expressions = buildMatchExpressions(sql, request);
  return sql`
    WITH ${buildHitSteps(sql, request, expressions, windowSize)},
    "context" AS MATERIALIZED (${buildContext(sql, asText(sql`"hits"`))}),
    "eligible" AS (
      SELECT "hit"."id", "hit"."rank",
        ${buildPageOf(sql)} AS "pageId",
        ${buildMatchChain(sql)} AS "chain",
        ${buildPageChain(sql)} AS "pageChain",
        ${buildRuleOwner(sql)} AS "ruleOwner"
      FROM "hits" AS "hit"
      LEFT JOIN "context" ON "context"."id" = "hit"."parentId"
      INNER JOIN "Block" AS "page" ON "page"."id" = ${buildPageOf(sql)}
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
      "ranked"."pageBestId",
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
    LEFT JOIN "Block" AS "parent" ON "parent"."id" = "page"."parentId" AND "parent"."type" = ${BLOCK_TYPE.page}::text
    ${buildOrder(sql, request)}
  `;
};

/** How many matches there are, up to one past the window: more than the window means it left some out. */
export const buildProbeStatement = (
  sql: NeumaSqlTag,
  request: SearchCandidateRequest,
  windowSize: number,
): SqlTemplate =>
  sql`
    SELECT count(*)::int AS "matched" FROM (
      SELECT 1 FROM "Block" AS "block"
      WHERE ${buildHitFilters(sql, request, buildMatchExpressions(sql, request))}
      LIMIT ${windowSize + 1}::int4
    ) AS "probe"
  `;
