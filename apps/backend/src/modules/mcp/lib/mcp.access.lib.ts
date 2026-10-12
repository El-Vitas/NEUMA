import {
  ACCESS_TOKEN_PERMISSIONS,
  ACCESS_TOKEN_READ_PERMISSIONS,
  type AccessTokenPermission,
  canRoleGrantAccessTokenPermission,
  isOneOf,
  listAccessTokenGrantedPermissions,
  readAccessTokenPermissionsAt,
} from '@neuma/shared';
import type { AccessTokenPageReach, AccessTokenPageRuleProbe } from '../../../common/types/access-token.types';
import type { SearchTokenScope } from '../../../common/types/search.types';
import type { McpPrincipal, McpToolDefinition } from '../types/mcp.types';

export const permitsPageReading = (permissions: readonly AccessTokenPermission[]): boolean =>
  permissions.includes(ACCESS_TOKEN_PERMISSIONS.pagesRead);

export const permitsListing = (permissions: readonly AccessTokenPermission[]): boolean =>
  permissions.some((permission) => isOneOf(ACCESS_TOKEN_READ_PERMISSIONS, permission));

export const listMcpPageRuleProbes = (
  principal: McpPrincipal,
  permits: (permissions: readonly AccessTokenPermission[]) => boolean,
): readonly AccessTokenPageRuleProbe[] =>
  principal.access.pages.map((grant) => ({ allows: permits(grant.permissions), pageId: grant.pageId }));

/** Visible when the space rule allows reading, or it holds a page whose nearest rule does. */
export const canMcpPrincipalSeeSpace = (
  principal: McpPrincipal,
  spaceId: string,
  reach: AccessTokenPageReach,
): boolean =>
  permitsListing(readAccessTokenPermissionsAt(principal.access, { lineage: [], spaceId })) ||
  reach.spaceIdsWithAllowedPages.includes(spaceId);

/** Derived from the token's grants, never from agent input; on top of the owner's visibility it only narrows. */
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

const listUsablePermissions = (principal: McpPrincipal): readonly AccessTokenPermission[] =>
  listAccessTokenGrantedPermissions(principal.access).filter((permission) =>
    canRoleGrantAccessTokenPermission(principal.role, permission),
  );

/** Hides tools that would always fail. Without an identity all are offered and each call reports the key problem. */
export const listMcpToolsOffered = (
  tools: readonly McpToolDefinition[],
  principal: McpPrincipal | null,
): readonly McpToolDefinition[] => {
  if (principal === null) return tools;
  const usable = listUsablePermissions(principal);
  return tools.filter((tool) => tool.requires.some((permission) => usable.includes(permission)));
};
