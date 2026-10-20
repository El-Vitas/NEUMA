import { SpaceVisibility } from '@neuma/db';
import type { UserRole } from '@neuma/shared';
import { canReadSpace } from '../../../common/domain/workspace.domain';
import type { SearchTokenScope } from '../../../common/types/search.types';
import { buildSqlTextList } from '../../../prisma/prisma.sql.lib';
import type { NeumaSqlTag } from '../../../prisma/types/prisma.types';
import type { SqlFragment } from '../types/search.sql.types';
import type { SearchEditedRange } from '../types/search.types';
import { buildSearchAnywherePattern } from './search.pattern.utils';
import { asBoolean, asText } from './search.sql.utils';

const buildEditedRangeStart = (sql: NeumaSqlTag, range: SearchEditedRange): SqlFragment => {
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
 * every other one moot and expose private spaces. The space row is aliased `space`.
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

/** The block was last edited within the range; evaluated against `now()` at query time. */
export const buildEditedRangeFilter = (
  sql: NeumaSqlTag,
  range: SearchEditedRange,
  editedAtColumn: SqlFragment,
): SqlFragment => asBoolean(sql`${editedAtColumn} >= ${buildEditedRangeStart(sql, range)}`);

/** Evaluated against `now()` at query time, so an expired verification stops matching without a rewrite. */
export const buildVerifiedOnlyFilter = (sql: NeumaSqlTag): SqlFragment =>
  asBoolean(sql`(
  "page"."verifiedAt" IS NOT NULL
  AND ("page"."verificationExpiresAt" IS NULL OR "page"."verificationExpiresAt" > now())
)`);

/** The page row is aliased `page`. */
export const buildAuthorFilter = (sql: NeumaSqlTag, authorQuery: string): SqlFragment =>
  asBoolean(sql`EXISTS (
  SELECT 1 FROM "User" AS "author"
  WHERE "author"."id" = "page"."createdById" AND "author"."name" ILIKE ${buildSearchAnywherePattern(authorQuery)}
)`);

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
 * space's rule. Added to the user's visibility, never replacing it.
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
