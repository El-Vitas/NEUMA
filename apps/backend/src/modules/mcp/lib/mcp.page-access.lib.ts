import { PageLifecycle } from '@neuma/db';
import {
  ACCESS_TOKEN_PERMISSIONS,
  type AccessTokenPermission,
  type AccessTokenPlace,
  canAccessTokenAct,
  type Result,
} from '@neuma/shared';
import {
  MCP_CONCURRENT_CHANGE_MESSAGE,
  MCP_CONCURRENT_REFUSAL_CODES,
  MCP_CREATE_PAGE_PLACE_MESSAGE,
  MCP_DETAILED_REFUSAL_CODES,
  MCP_INACCESSIBLE_MESSAGE,
  MCP_INACCESSIBLE_REFUSAL_CODES,
  MCP_LOCKED_REFUSAL_CODE,
  MCP_PAGE_IN_TRASH_MESSAGE,
  MCP_PAGE_LOCKED_MESSAGE,
  MCP_PAGE_NOT_IN_TRASH_MESSAGE,
  MCP_REFUSAL_EXPLANATIONS,
  MCP_REFUSED_CHANGE_PREFIX,
  MCP_UNREADABLE_ADDRESS_MESSAGE,
} from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpRefusal } from '../types/mcp.collections.types';
import type { McpCall, McpCreationPlace, McpOpenedPage, McpServerDependencies } from '../types/mcp.types';
import { readMcpAddress } from './mcp.address.lib';
import { readMcpPlace, requireMcpPermissionAt } from './mcp.tool.lib';

export const readMcpPageId = (address: string): string => {
  const read = readMcpAddress(address);
  switch (read.kind) {
    case 'page':
      return read.pageId;
    case 'id':
      return read.id;
    default:
      throw new McpToolError(MCP_UNREADABLE_ADDRESS_MESSAGE);
  }
};

/**
 * Refusal detail travels only when it concerns what the agent wrote and can correct. For an
 * unknown code only the code is sent: its detail could name something the token cannot reach.
 */
export const explainMcpRefusal = (refusal: McpRefusal): string => {
  const { code, details } = refusal;
  if (MCP_INACCESSIBLE_REFUSAL_CODES.includes(code)) return MCP_INACCESSIBLE_MESSAGE;
  if (code === MCP_LOCKED_REFUSAL_CODE) return MCP_PAGE_LOCKED_MESSAGE;
  const explained = MCP_REFUSAL_EXPLANATIONS.get(code);
  if (explained !== undefined) return explained;
  const isAboutWhatWasWritten = MCP_DETAILED_REFUSAL_CODES.includes(code);
  if (isAboutWhatWasWritten && typeof details === 'string') return `${MCP_REFUSED_CHANGE_PREFIX} ${details}`;
  if (MCP_CONCURRENT_REFUSAL_CODES.includes(code)) return MCP_CONCURRENT_CHANGE_MESSAGE;
  if (!isAboutWhatWasWritten || details === undefined) return `${MCP_REFUSED_CHANGE_PREFIX} ${code}`;
  return `${MCP_REFUSED_CHANGE_PREFIX} ${JSON.stringify(details)}`;
};

/** A write that answers with the page content asks this first, since writing does not grant reading. */
export const canMcpAct = (call: McpCall, place: AccessTokenPlace, permission: AccessTokenPermission): boolean =>
  canAccessTokenAct(call.principal.access, call.principal.role, place, permission);

export const requireMcpSuccess = <TValue>(result: Result<TValue, McpRefusal>): TValue => {
  if (result.isFail()) throw new McpToolError(explainMcpRefusal(result.getError()));
  return result.getValue();
};

export const requireMcpInput = <TValue>(result: Result<TValue, string>): TValue => {
  if (result.isFail()) throw new McpToolError(result.getError());
  return result.getValue();
};

/** Always needs page write at the place; a collection, for instance, may need more. */
export const resolveMcpCreationPlace = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  where: { readonly parent?: string | undefined; readonly space?: string | undefined },
  alsoRequired: readonly AccessTokenPermission[],
): Promise<McpCreationPlace> => {
  const requireAlso = (place: AccessTokenPlace): void => {
    for (const permission of alsoRequired) requireMcpPermissionAt(call.principal, place, permission);
  };
  if (where.parent !== undefined && where.space === undefined) {
    const pageId = readMcpPageId(where.parent);
    const { page, place } = await openMcpPage(dependencies, call, pageId, ACCESS_TOKEN_PERMISSIONS.pagesWrite);
    requireAlso(place);
    return { parentId: page.id, parentPlace: place, spaceId: page.spaceId };
  }
  if (where.space === undefined || where.parent !== undefined) throw new McpToolError(MCP_CREATE_PAGE_PLACE_MESSAGE);
  const spaceTop = { lineage: [], spaceId: where.space };
  requireMcpPermissionAt(call.principal, spaceTop, ACCESS_TOKEN_PERMISSIONS.pagesWrite);
  requireAlso(spaceTop);
  return { parentId: null, parentPlace: spaceTop, spaceId: where.space };
};

const openMcpPageInAnyLifecycle = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
  permission: AccessTokenPermission,
): Promise<McpOpenedPage> => {
  const { principal, workspace } = call;
  const [page, place] = await Promise.all([
    dependencies.pagesService.getAccessible(pageId, workspace.id, principal.userId, principal.role),
    readMcpPlace(dependencies, pageId, workspace.id),
  ]);
  if (page.isFail()) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  requireMcpPermissionAt(principal, place, permission);
  return { page: page.getValue(), place };
};

/** Unseen and untouchable pages get the same answer. A trashed page cannot be changed until restored. */
export const openMcpPage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
  permission: AccessTokenPermission,
): Promise<McpOpenedPage> => {
  const opened = await openMcpPageInAnyLifecycle(dependencies, call, pageId, permission);
  if (opened.page.lifecycle !== PageLifecycle.ACTIVE) throw new McpToolError(MCP_PAGE_IN_TRASH_MESSAGE);
  return opened;
};

export const openMcpTrashedPage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
  permission: AccessTokenPermission,
): Promise<McpOpenedPage> => {
  const opened = await openMcpPageInAnyLifecycle(dependencies, call, pageId, permission);
  if (opened.page.lifecycle !== PageLifecycle.TRASHED) throw new McpToolError(MCP_PAGE_NOT_IN_TRASH_MESSAGE);
  return opened;
};
