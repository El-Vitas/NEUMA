import {
  type AccessTokenAccess,
  type AccessTokenPermission,
  accessTokenPermissionSchema,
  type UserRole,
} from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { requireRow } from '../../../../common/utils/required-row.utils';
import type { NeumaModels } from '../../../../prisma/types/prisma.types';
import type {
  AccessTokenNamedGrant,
  AccessTokenNamedPageGrant,
  AccessTokenRecord,
} from '../../domain/access-token.domain.types';
import type { AccessTokenFilter, StoredAccessToken } from '../../types/access-token.types';

/** The column is free text, so a permission removed from the catalog is dropped instead of breaking the read. */
export const readStoredPermissions = (stored: readonly string[]): readonly AccessTokenPermission[] =>
  stored.flatMap((permission) => {
    const known = accessTokenPermissionSchema.safeParse(permission);
    return known.success ? [known.data] : [];
  });

const readPageTitles = async (
  models: NeumaModels,
  pageIds: readonly string[],
): Promise<ReadonlyMap<string, string>> => {
  if (pageIds.length === 0) return new Map();
  const pages = await models.Page.select('id', 'title')
    .where((page) => page.id.in([...pageIds]))
    .all();
  return new Map(pages.map((page) => [page.id, page.title]));
};

/** Names come only from places the viewer can see, so an admin cannot read private names off another's token. */
export const readStoredAccessTokens = async (
  models: NeumaModels,
  viewerId: string,
  viewerRole: UserRole,
  filter: AccessTokenFilter,
): Promise<readonly (StoredAccessToken & { readonly user: { readonly id: string; readonly name: string } })[]> => {
  const canSeeSpace = buildSpaceVisibilityFilter(viewerId, viewerRole);
  const rows = await models.AccessToken.select(
    'allSpacesPermissions',
    'createdAt',
    'displayPrefix',
    'expiresAt',
    'id',
    'lastUsedAt',
    'name',
  )
    .where(filter)
    .include('grants', (grants) =>
      grants.combine({
        total: grants.count(),
        visible: grants
          .where((grant) => grant.space.some(canSeeSpace))
          .select('permissions')
          .include('space', (space) => space.select('id', 'name')),
      }),
    )
    .include('pageGrants', (pageGrants) =>
      pageGrants.combine({
        total: pageGrants.count(),
        visible: pageGrants
          .where((grant) => grant.page.some((page) => page.space.some(canSeeSpace)))
          .select('pageId', 'permissions')
          .include('page', (page) => page.select('id').include('space', (space) => space.select('name'))),
      }),
    )
    .include('user', (user) => user.select('id', 'name'))
    .orderBy((token) => token.createdAt.desc())
    .all();
  const pageTitles = await readPageTitles(
    models,
    rows.flatMap((row) => row.pageGrants.visible.map((grant) => grant.pageId)),
  );
  return rows.map((row) => ({
    _count: { grants: row.grants.total, pageGrants: row.pageGrants.total },
    allSpacesPermissions: row.allSpacesPermissions,
    createdAt: row.createdAt,
    displayPrefix: row.displayPrefix,
    expiresAt: row.expiresAt,
    grants: row.grants.visible.map((grant) => ({
      permissions: grant.permissions,
      space: requireRelation(grant.space, 'space of a grant'),
    })),
    id: row.id,
    lastUsedAt: row.lastUsedAt,
    name: row.name,
    pageGrants: row.pageGrants.visible.map((grant) => {
      const page = requireRelation(grant.page, 'page of a grant');
      return {
        page: {
          id: page.id,
          space: requireRelation(page.space, 'space of a page'),
          title: requireRow(pageTitles.get(page.id) ?? null, `Title of page ${page.id}`),
        },
        permissions: grant.permissions,
      };
    }),
    user: requireRelation(row.user, 'owner of a token'),
  }));
};

/** The foreign keys are required, so a missing related row means the read raced a delete. */
export const requireRelation = <Related>(related: Related | null, description: string): Related =>
  requireRow(related, `The ${description}`);

const toNamedGrant = (grant: StoredAccessToken['grants'][number]): AccessTokenNamedGrant => ({
  permissions: readStoredPermissions(grant.permissions),
  spaceId: grant.space.id,
  spaceName: grant.space.name,
});

const toNamedPageGrant = (grant: StoredAccessToken['pageGrants'][number]): AccessTokenNamedPageGrant => ({
  pageId: grant.page.id,
  pageTitle: grant.page.title,
  permissions: readStoredPermissions(grant.permissions),
  spaceName: grant.page.space.name,
});

const countHiddenPlaces = (stored: StoredAccessToken): number =>
  stored._count.grants - stored.grants.length + stored._count.pageGrants - stored.pageGrants.length;

export const toAccessTokenRecord = (stored: StoredAccessToken): AccessTokenRecord => ({
  allSpaces: readStoredPermissions(stored.allSpacesPermissions),
  createdAt: stored.createdAt,
  displayPrefix: stored.displayPrefix,
  expiresAt: stored.expiresAt,
  hiddenPlaceCount: countHiddenPlaces(stored),
  id: stored.id,
  lastUsedAt: stored.lastUsedAt,
  name: stored.name,
  pages: stored.pageGrants.map(toNamedPageGrant),
  spaces: stored.grants.map(toNamedGrant),
});

export const toSpaceGrantRows = (access: AccessTokenAccess) =>
  access.spaces.map((grant) => ({ permissions: [...grant.permissions], spaceId: grant.spaceId }));

export const toPageGrantRows = (access: AccessTokenAccess) =>
  access.pages.map((grant) => ({ pageId: grant.pageId, permissions: [...grant.permissions] }));

export const toStoredAccess = (stored: {
  readonly allSpacesPermissions: readonly string[];
  readonly grants: readonly { readonly permissions: readonly string[]; readonly spaceId: string }[];
  readonly pageGrants: readonly { readonly pageId: string; readonly permissions: readonly string[] }[];
}): AccessTokenAccess => ({
  allSpaces: readStoredPermissions(stored.allSpacesPermissions),
  pages: stored.pageGrants.map((grant) => ({
    pageId: grant.pageId,
    permissions: readStoredPermissions(grant.permissions),
  })),
  spaces: stored.grants.map((grant) => ({
    permissions: readStoredPermissions(grant.permissions),
    spaceId: grant.spaceId,
  })),
});
