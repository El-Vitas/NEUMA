import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenPermission, type AccessTokenPlace } from '@company-brain/shared';
import { MCP_PROTECTED_UNREADABLE_DESCENDANT_MESSAGE, MCP_REDACTED_REFERENCE_LABEL } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpManagedPage, McpManagedPageOutput } from '../types/mcp.page-management.types';
import type { McpCall, McpGrantPlace, McpPerson, McpServerDependencies } from '../types/mcp.types';
import { buildMcpPageUrl } from './mcp.address.lib';
import { canMcpAct } from './mcp.page-access.lib';
import { findMcpProtectedDescendant } from './mcp.page-lifecycle.lib';

/** The title is shown only if the token can read the page there: trashing or moving it does not grant reading. */
export const describeMcpManagedPage = (
  dependencies: McpServerDependencies,
  call: McpCall,
  managed: { readonly page: McpManagedPage; readonly place: AccessTokenPlace },
): McpManagedPageOutput['page'] => {
  const { page, place } = managed;
  return {
    id: page.id,
    title: canMcpAct(call, place, ACCESS_TOKEN_PERMISSIONS.pagesRead) ? page.title : MCP_REDACTED_REFERENCE_LABEL,
    url: buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, null),
  };
};

export const formatMcpManagedPageText = (output: McpManagedPageOutput): string =>
  [
    `${output.page.title} — ${output.page.url}`,
    output.changed === undefined ? '' : `Changed: ${output.changed.join(', ')}.`,
    output.childPages === undefined ? '' : `Pages under it that went along: ${String(output.childPages)}.`,
  ]
    .filter((line) => line !== '')
    .join('\n');

const readGrantPlaces = async (dependencies: McpServerDependencies, call: McpCall): Promise<McpGrantPlace[]> => {
  const places = await dependencies.placeReader.readPlaces(
    call.principal.access.pages.map((grant) => grant.pageId),
    call.workspace.id,
  );
  return [...places].map(([pageId, place]) => ({ pageId, place }));
};

/** A descendant's own rule protects its ancestor too. It is named only if readable: otherwise naming it reveals it. */
export const requireMcpWholeTree = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
  permission: AccessTokenPermission,
): Promise<void> => {
  const protectedPage = findMcpProtectedDescendant(
    call.principal,
    pageId,
    await readGrantPlaces(dependencies, call),
    permission,
  );
  if (protectedPage === null) return;
  if (!canMcpAct(call, protectedPage.place, ACCESS_TOKEN_PERMISSIONS.pagesRead))
    throw new McpToolError(MCP_PROTECTED_UNREADABLE_DESCENDANT_MESSAGE);
  throw new McpToolError(
    `Page ${protectedPage.pageId} hangs from this page and this token may not do that to it, so nothing was done. Leave that page out first, or ask its owner.`,
  );
};

/** Name matching ignores case; a name shared by two people selects neither. */
export const findMcpPerson = (people: readonly McpPerson[], named: string): McpPerson => {
  const byId = people.find((person) => person.id === named);
  if (byId !== undefined) return byId;
  const wanted = named.trim().toLocaleLowerCase();
  const byName = people.filter((person) => person.name.trim().toLocaleLowerCase() === wanted);
  const [only] = byName;
  if (byName.length === 1 && only !== undefined) return only;
  throw new McpToolError(
    byName.length === 0
      ? `Nobody in the workspace is called "${named}".`
      : `Several people are called "${named}": name the person by id.`,
  );
};
