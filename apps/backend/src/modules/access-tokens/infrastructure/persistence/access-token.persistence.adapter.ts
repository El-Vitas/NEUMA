import { type AccessTokenPermission, accessTokenPermissionSchema, type UserRole } from '@company-brain/shared';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import type { AccessTokenNamedGrant, AccessTokenRecord } from '../../domain/access-token.domain.types';
import type { StoredAccessToken } from '../../types/access-token.types';

/**
 * Los permisos guardados, quedándose con los que el catálogo todavía conoce.
 *
 * La columna es texto libre para la base. Un permiso que dejó de existir no
 * rompe la lectura del token: simplemente ya no da nada.
 */
export const readStoredPermissions = (stored: readonly string[]): readonly AccessTokenPermission[] =>
  stored.flatMap((permission) => {
    const known = accessTokenPermissionSchema.safeParse(permission);
    return known.success ? [known.data] : [];
  });

/**
 * Lo que se lee de un token para mostrarlo, visto por alguien.
 *
 * Los accesos se traen con nombre solo en los espacios que ve quien mira; los
 * demás solo se cuentan. Así un administrador no lee el nombre del espacio
 * privado que otra persona le dio a su propio token, y quien perdió un espacio
 * no sigue leyendo su nombre en su lista.
 */
export const accessTokenRecordSelectFor = (viewerId: string, viewerRole: UserRole) =>
  ({
    _count: { select: { grants: true } },
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
  }) as const;

const toNamedGrant = (grant: StoredAccessToken['grants'][number]): AccessTokenNamedGrant => ({
  permissions: readStoredPermissions(grant.permissions),
  spaceId: grant.space.id,
  spaceName: grant.space.name,
});

export const toAccessTokenRecord = (stored: StoredAccessToken): AccessTokenRecord => ({
  allSpaces: readStoredPermissions(stored.allSpacesPermissions),
  createdAt: stored.createdAt,
  displayPrefix: stored.displayPrefix,
  expiresAt: stored.expiresAt,
  hiddenSpaceCount: stored._count.grants - stored.grants.length,
  id: stored.id,
  lastUsedAt: stored.lastUsedAt,
  name: stored.name,
  spaces: stored.grants.map(toNamedGrant),
});
