import type { AccessTokenPermission } from '@company-brain/shared';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpManagedPage, McpManagedPageOutput } from '../types/mcp.page-management.types';
import type { McpCall, McpGrantPlace, McpPerson, McpServerDependencies } from '../types/mcp.types';
import { buildMcpPageUrl } from './mcp.address.lib';
import { findMcpProtectedDescendant } from './mcp.page-lifecycle.lib';

/** Una página cambiada entera, con el enlace que una persona puede abrir. */
export const describeMcpManagedPage = (
  dependencies: McpServerDependencies,
  page: McpManagedPage,
): McpManagedPageOutput['page'] => ({
  id: page.id,
  title: page.title,
  url: buildMcpPageUrl(dependencies.portalUrl, page.spaceId, page.id, null),
});

/** Un cambio a una página entera en texto: qué página, dónde, y qué cambió. */
export const formatMcpManagedPageText = (output: McpManagedPageOutput): string =>
  [
    `${output.page.title} — ${output.page.url}`,
    output.changed === undefined ? '' : `Changed: ${output.changed.join(', ')}.`,
    output.childPages === undefined ? '' : `Pages under it that went along: ${String(output.childPages)}.`,
  ]
    .filter((line) => line !== '')
    .join('\n');

const readGrantPlaces = async (dependencies: McpServerDependencies, call: McpCall): Promise<McpGrantPlace[]> => {
  const places = await Promise.all(
    call.principal.access.pages.map(async (grant) => ({
      pageId: grant.pageId,
      place: await dependencies.placeReader.readPlace(grant.pageId, call.workspace.id),
    })),
  );
  return places.flatMap(({ pageId, place }) => (place === null ? [] : [{ pageId, place }]));
};

/**
 * Revisa que el token pueda hacer algo que alcanza a todo lo que cuelga de una
 * página —mandarlo a la papelera, moverlo, copiarlo—, y no solo a la página:
 * una página de abajo con su propia regla que no lo deja la protege a ella y
 * a la de arriba, y se nombra.
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
  if (protectedPage !== null)
    throw new McpToolError(
      `Page ${protectedPage} hangs from this page and this token may not do that to it, so nothing was done. Leave that page out first, or ask its owner.`,
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
