import {
  type AccessTokenAccess,
  type AccessTokenPermission,
  accessTokenPermissionSchema,
  type UserRole,
} from '@neuma/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import type {
  AccessTokenNamedGrant,
  AccessTokenNamedPageGrant,
  AccessTokenRecord,
} from '../../domain/access-token.domain.types';
import type { StoredAccessToken } from '../../types/access-token.types';

/** The column is free text, so a permission removed from the catalog is dropped instead of breaking the read. */
export const readStoredPermissions = (stored: readonly string[]): readonly AccessTokenPermission[] =>
  stored.flatMap((permission) => {
    const known = accessTokenPermissionSchema.safeParse(permission);
    return known.success ? [known.data] : [];
  });

/** Names come only from places the viewer can see, so an admin cannot read private names off another's token. */
export const accessTokenRecordSelectFor = (viewerId: string, viewerRole: UserRole) =>
  ({
    _count: { select: { grants: true, pageGrants: true } },
    allSpacesPermissions: true,
    createdAt: true,
    displayPrefix: true,
    expiresAt: true,
    grants: {
      select: { permissions: true, space: { select: { id: true, name: true } } },
      where: { space: buildSpaceVisibilityFilter(viewerId, viewerRole) },
    },
    id: true,
    lastUsedAt: true,
    name: true,
    pageGrants: {
      select: {
        page: { select: { id: true, space: { select: { name: true } }, title: true } },
        permissions: true,
      },
      where: { page: { space: buildSpaceVisibilityFilter(viewerId, viewerRole) } },
    },
  }) as const;

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
