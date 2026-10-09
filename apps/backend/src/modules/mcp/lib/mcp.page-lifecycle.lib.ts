import { type AccessTokenPermission, canAccessTokenAct } from '@company-brain/shared';
import type { McpGrantPlace, McpPrincipal } from '../types/mcp.types';

/** Only pages with their own rule matter: the rest inherit the rule above, already checked on the page itself. */
export const findMcpProtectedDescendant = (
  principal: McpPrincipal,
  targetId: string,
  grantPlaces: readonly McpGrantPlace[],
  permission: AccessTokenPermission,
): McpGrantPlace | null =>
  grantPlaces.find(
    ({ pageId, place }) =>
      pageId !== targetId &&
      place.lineage.includes(targetId) &&
      !canAccessTokenAct(principal.access, principal.role, place, permission),
  ) ?? null;
