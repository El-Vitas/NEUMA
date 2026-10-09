import {
  ACCESS_TOKEN_PERMISSIONS,
  ACCESS_TOKEN_READ_PERMISSIONS,
  type AccessTokenPermission,
  canRoleGrantAccessTokenPermission,
  isOneOf,
  listAccessTokenGrantedPermissions,
  readAccessTokenPermissionsAt,
} from '@company-brain/shared';
import type { AccessTokenPageReach, AccessTokenPageRuleProbe } from '../../../common/types/access-token.types';
import type { SearchTokenScope } from '../../../common/types/search.types';
import type { McpPrincipal, McpToolDefinition } from '../types/mcp.types';

/** Si unos permisos dejan leer páginas: lo que hace falta para leer y buscar. */
export const permitsPageReading = (permissions: readonly AccessTokenPermission[]): boolean =>
  permissions.includes(ACCESS_TOKEN_PERMISSIONS.pagesRead);

/** Si unos permisos dejan leer algo, páginas o colecciones: lo que hace falta para ver un espacio. */
export const permitsListing = (permissions: readonly AccessTokenPermission[]): boolean =>
  permissions.some((permission) => isOneOf(ACCESS_TOKEN_READ_PERMISSIONS, permission));

/** Cada regla de página del token, con si deja lo que se pregunta. */
export const listMcpPageRuleProbes = (
  principal: McpPrincipal,
  permits: (permissions: readonly AccessTokenPermission[]) => boolean,
): readonly AccessTokenPageRuleProbe[] =>
  principal.access.pages.map((grant) => ({ allows: permits(grant.permissions), pageId: grant.pageId }));

/**
 * Si el token ve este espacio: su regla de espacio (o la de todos) deja leer
 * algo, o tiene dentro alguna página que su regla más cercana deja leer.
 */
export const canMcpPrincipalSeeSpace = (
  principal: McpPrincipal,
  spaceId: string,
  reach: AccessTokenPageReach,
): boolean =>
  permitsListing(readAccessTokenPermissionsAt(principal.access, { lineage: [], spaceId })) ||
  reach.spaceIdsWithAllowedPages.includes(spaceId);

/**
 * Dónde puede buscar el token, ya resuelto con el árbol de hoy. Sale de lo que
 * tiene dado y nunca de lo que pide el agente, y se suma a la visibilidad de
 * su dueño: solo puede achicar la búsqueda.
 */
export const buildMcpSearchScope = (principal: McpPrincipal, reach: AccessTokenPageReach): SearchTokenScope => ({
  allowedPageIds: reach.allowedPageIds,
  closedPageIds: reach.closedPageIds,
  closedSpaceIds: principal.access.spaces
    .filter((grant) => !permitsPageReading(grant.permissions))
    .map((grant) => grant.spaceId),
  openSpaceIds: principal.access.spaces
    .filter((grant) => permitsPageReading(grant.permissions))
    .map((grant) => grant.spaceId),
  readsEverywhere: permitsPageReading(principal.access.allSpaces),
});

/** Lo que el token tiene dado en algún lugar y su dueño todavía puede hacer. */
const listUsablePermissions = (principal: McpPrincipal): readonly AccessTokenPermission[] =>
  listAccessTokenGrantedPermissions(principal.access).filter((permission) =>
    canRoleGrantAccessTokenPermission(principal.role, permission),
  );

/**
 * Las herramientas que se le ofrecen al agente.
 *
 * Solo las que puede usar en algún lugar: una herramienta que siempre
 * fallaría es un nombre más entre los que el agente tiene que elegir, y gasta
 * contexto en cada conversación. Sin identidad no hay con qué recortar, y se
 * ofrecen todas para que cada llamada diga qué pasa con la llave.
 */
export const listMcpToolsOffered = (
  tools: readonly McpToolDefinition[],
  principal: McpPrincipal | null,
): readonly McpToolDefinition[] => {
  if (principal === null) return tools;
  const usable = listUsablePermissions(principal);
  return tools.filter((tool) => tool.requires.some((permission) => usable.includes(permission)));
};
