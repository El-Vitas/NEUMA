import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenPermission, type AccessTokenPlace } from '@company-brain/shared';
import { MCP_PROTECTED_UNREADABLE_DESCENDANT_MESSAGE, MCP_REDACTED_REFERENCE_LABEL } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpManagedPage, McpManagedPageOutput } from '../types/mcp.page-management.types';
import type { McpCall, McpGrantPlace, McpPerson, McpServerDependencies } from '../types/mcp.types';
import { buildMcpPageUrl } from './mcp.address.lib';
import { canMcpAct } from './mcp.page-access.lib';
import { findMcpProtectedDescendant } from './mcp.page-lifecycle.lib';

/**
 * Una página cambiada entera, con el enlace que una persona puede abrir. Su
 * título se dice solo si el token puede leerla ahí: mandarla a la papelera o
 * moverla no da derecho a leerla.
 */
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

/** Un cambio a una página entera en texto: qué página, dónde, y qué cambió. */
export const formatMcpManagedPageText = (output: McpManagedPageOutput): string =>
  [
    `${output.page.title} — ${output.page.url}`,
    output.changed === undefined ? '' : `Changed: ${output.changed.join(', ')}.`,
    output.childPages === undefined ? '' : `Pages under it that went along: ${String(output.childPages)}.`,
  ]
    .filter((line) => line !== '')
    .join('\n');

/** Dónde está hoy cada página con su propia regla en el token, leído de una vez. */
const readGrantPlaces = async (dependencies: McpServerDependencies, call: McpCall): Promise<McpGrantPlace[]> => {
  const places = await dependencies.placeReader.readPlaces(
    call.principal.access.pages.map((grant) => grant.pageId),
    call.workspace.id,
  );
  return [...places].map(([pageId, place]) => ({ pageId, place }));
};

/**
 * Revisa que el token pueda hacer algo que alcanza a todo lo que cuelga de una
 * página —mandarlo a la papelera, moverlo, copiarlo—, y no solo a la página:
 * una página de abajo con su propia regla que no lo deja la protege a ella y
 * a la de arriba. Se nombra solo si el token puede leerla; si no, nombrarla
 * diría que existe.
 */
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

/**
 * Una persona del espacio de trabajo por su id o por su nombre, sin distinguir
 * mayúsculas. Un nombre que tienen dos personas no elige a ninguna.
 */
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
