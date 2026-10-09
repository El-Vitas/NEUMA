import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenPlace, type PageIcon, pageIconSchema } from '@company-brain/shared';
import {
  MCP_NOTHING_TO_CHANGE_MESSAGE,
  MCP_PAGE_ICON_INVALID_MESSAGE,
  MCP_PAGE_MANAGE_REFUSED_MESSAGE,
  MCP_TOOL_NAMES,
} from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import { runMcpWrite } from '../lib/mcp.actions.lib';
import { requireMcpRowChangeAllowed } from '../lib/mcp.collections.lib';
import { canMcpAct, explainMcpRefusal, openMcpPage, readMcpPageId } from '../lib/mcp.page-access.lib';
import { describeMcpManagedPage, findMcpPerson, formatMcpManagedPageText } from '../lib/mcp.page-management.lib';
import { readMcpActor } from '../lib/mcp.tool.lib';
import { managedPageOutputSchema, updatePageInputSchema } from '../schemas/mcp.pages.schemas';
import type {
  McpManagedPage,
  McpManagedPageOutput,
  McpPageStep,
  McpUpdatePageInput,
} from '../types/mcp.page-management.types';
import type { McpCall, McpServerDependencies, McpToolDefinition, McpWriteSession } from '../types/mcp.types';

const readOwnerId = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  owner: string | null,
): Promise<string | null> =>
  owner === null ? null : findMcpPerson(await dependencies.people.listAssignableMembers(call.workspace.id), owner).id;

const asksToManage = (input: McpUpdatePageInput): boolean =>
  input.locked !== undefined || input.verified !== undefined || input.owner !== undefined;

/**
 * Bloquear, verificar y dar dueño son actos de confianza sobre la página, con
 * su propio permiso del token: poder escribirla no alcanza. Se revisa antes de
 * cambiar nada, así un pedido que mezcla las dos cosas no queda a medias.
 */
const requireManaging = (call: McpCall, place: AccessTokenPlace, input: McpUpdatePageInput): void => {
  if (!asksToManage(input)) return;
  if (!canMcpAct(call, place, ACCESS_TOKEN_PERMISSIONS.pagesManage))
    throw new McpToolError(MCP_PAGE_MANAGE_REFUSED_MESSAGE);
};

/**
 * El emoji pedido, revisado con la misma regla que aplica la página antes de
 * cambiar nada: si se revisara al llegar a su paso, el título ya habría cambiado.
 */
const readIcon = (icon: string | null | undefined): PageIcon | null | undefined => {
  if (icon === undefined || icon === null) return icon;
  const parsed = pageIconSchema.safeParse({ kind: 'emoji', value: icon });
  if (!parsed.success) throw new McpToolError(MCP_PAGE_ICON_INVALID_MESSAGE);
  return parsed.data;
};

/**
 * Los cambios pedidos, en el orden en que no chocan entre sí: desbloquear va
 * primero, porque una página bloqueada no se renombra, y bloquear va al final.
 */
const planSteps = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
  input: McpUpdatePageInput,
): Promise<McpPageStep[]> => {
  const { pages } = dependencies;
  const onPage = { ...readMcpActor(call), pageId };
  const { title } = input;
  if (input.verifiedUntil !== undefined && input.verified !== true)
    throw new McpToolError('verifiedUntil goes with verified: true.');
  const icon = readIcon(input.icon);
  const ownerId = input.owner === undefined ? undefined : await readOwnerId(dependencies, call, input.owner);
  const steps: (McpPageStep | null)[] = [
    input.locked === false ? { apply: () => pages.setLocked({ ...onPage, locked: false }), name: 'unlocked' } : null,
    title === undefined ? null : { apply: () => pages.rename({ ...onPage, title }), name: 'title' },
    icon === undefined ? null : { apply: () => pages.updateIcon({ ...onPage, icon }), name: 'icon' },
    input.removeCover === true
      ? { apply: () => pages.updateCover({ ...onPage, cover: null }), name: 'cover removed' }
      : null,
    input.verified === undefined
      ? null
      : {
          apply: () =>
            pages.setVerification({ ...onPage, expiresAt: input.verifiedUntil, verified: input.verified === true }),
          name: input.verified ? 'verified' : 'verification removed',
        },
    ownerId === undefined ? null : { apply: () => pages.setOwner({ ...onPage, ownerId }), name: 'owner' },
    input.locked === true ? { apply: () => pages.setLocked({ ...onPage, locked: true }), name: 'locked' } : null,
  ];
  return steps.filter((step) => step !== null);
};

/**
 * Hace los cambios uno tras otro. Si uno se rechaza, los de antes ya quedaron:
 * se dice cuáles, para que el agente no crea que la página quedó como estaba.
 */
const applySteps = async (steps: readonly McpPageStep[]): Promise<{ changed: string[]; page: McpManagedPage }> => {
  const changed: string[] = [];
  let page: McpManagedPage | null = null;
  for (const step of steps) {
    const result = await step.apply();
    if (result.isFail()) {
      const before = changed.length === 0 ? '' : ` Already changed before that: ${changed.join(', ')}.`;
      throw new McpToolError(`${explainMcpRefusal(result.getError())}${before}`);
    }
    changed.push(step.name);
    page = result.getValue();
  }
  if (page === null) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
  return { changed, page };
};

const updatePage = async (
  dependencies: McpServerDependencies,
  input: McpUpdatePageInput,
  { call, record }: McpWriteSession,
): Promise<McpManagedPageOutput> => {
  const { page, place } = await openMcpPage(
    dependencies,
    call,
    readMcpPageId(input.page),
    ACCESS_TOKEN_PERMISSIONS.pagesWrite,
  );
  requireManaging(call, place, input);
  if (input.title !== undefined)
    await requireMcpRowChangeAllowed(dependencies, call, { parentId: page.parentId, place });
  const steps = await planSteps(dependencies, call, page.id, input);
  if (steps.length === 0) throw new McpToolError(MCP_NOTHING_TO_CHANGE_MESSAGE);
  const request = {
    blockIds: [],
    detail: { changes: steps.map((step) => step.name) },
    pageId: page.id,
    tool: MCP_TOOL_NAMES.updatePage,
  };
  const done = await record(request, () => applySteps(steps));
  return { changed: done.changed, page: describeMcpManagedPage(dependencies, call, { page: done.page, place }) };
};

/**
 * Cambia una página entera, como se cambia desde su menú: el título, el
 * emoji, quitar la portada, bloquearla, verificarla o darle un dueño.
 */
export const updatePageTool: McpToolDefinition = {
  name: MCP_TOOL_NAMES.updatePage,
  register: (server, dependencies) => {
    server.registerTool(
      MCP_TOOL_NAMES.updatePage,
      {
        description:
          'Change a whole page the way its menu does: its title, its emoji icon, take its cover off, lock or unlock it, vouch for it as up to date (optionally until a day), or give it an owner who answers for it. Locking, vouching and giving an owner need the token to be allowed to manage pages there, apart from writing. What it says is changed with the block tools.',
        inputSchema: updatePageInputSchema,
        outputSchema: managedPageOutputSchema,
      },
      async (input) =>
        runMcpWrite(
          dependencies,
          { target: input.page, tool: MCP_TOOL_NAMES.updatePage },
          (session) => updatePage(dependencies, input, session),
          formatMcpManagedPageText,
        ),
    );
  },
  requires: [ACCESS_TOKEN_PERMISSIONS.pagesWrite],
};
