import { type AccessTokenPermission, canAccessTokenAct } from '@company-brain/shared';
import type { McpGrantPlace, McpPrincipal } from '../types/mcp.types';

/**
 * La primera página que cuelga de otra y cuya propia regla no deja al token
 * hacer algo que alcanza a todo el árbol, como mandarlo a la papelera. Solo
 * importan las páginas con una regla propia: las demás heredan la de arriba,
 * que ya se revisó en la página misma.
 */
export const findMcpProtectedDescendant = (
  principal: McpPrincipal,
  targetId: string,
  grantPlaces: readonly McpGrantPlace[],
  permission: AccessTokenPermission,
): string | null =>
  grantPlaces.find(
    ({ pageId, place }) =>
      pageId !== targetId &&
      place.lineage.includes(targetId) &&
      !canAccessTokenAct(principal.access, principal.role, place, permission),
  )?.pageId ?? null;
