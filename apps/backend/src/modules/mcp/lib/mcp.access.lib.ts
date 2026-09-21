import {
  ACCESS_TOKEN_PERMISSIONS,
  ACCESS_TOKEN_READ_PERMISSIONS,
  type AccessTokenPermission,
  canRoleGrantAccessTokenPermission,
  listAccessTokenGrantedPermissions,
  readAccessTokenSpacePermissions,
} from '@company-brain/shared';
import type { McpPrincipal, McpToolDefinition } from '../types/mcp.types';

/** Si el token ve este espacio: puede leer algo en él, páginas o colecciones. */
export const canMcpPrincipalReadSpace = (principal: McpPrincipal, spaceId: string): boolean =>
  readAccessTokenSpacePermissions(principal.access, spaceId).some((permission) =>
    ACCESS_TOKEN_READ_PERMISSIONS.some((reading) => reading === permission),
  );

/**
 * Dónde puede buscar el token, además de lo que su dueño ve.
 *
 * Nada que recortar cuando lee páginas en todos lados: manda la visibilidad del
 * dueño. Si no, solo los espacios nombrados donde lee páginas, y ninguno si no
 * lee páginas en ninguno.
 */
export const readMcpSearchSpaces = (principal: McpPrincipal): readonly string[] | undefined => {
  if (principal.access.allSpaces.includes(ACCESS_TOKEN_PERMISSIONS.pagesRead)) return undefined;
  return principal.access.spaces
    .filter((grant) => grant.permissions.includes(ACCESS_TOKEN_PERMISSIONS.pagesRead))
    .map((grant) => grant.spaceId);
};

/** Lo que el token tiene dado en algún espacio y su dueño todavía puede hacer. */
const listUsablePermissions = (principal: McpPrincipal): readonly AccessTokenPermission[] =>
  listAccessTokenGrantedPermissions(principal.access).filter((permission) =>
    canRoleGrantAccessTokenPermission(principal.role, permission),
  );

/**
 * Las herramientas que se le ofrecen al agente.
 *
 * Solo las que puede usar en algún espacio: una herramienta que siempre
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
