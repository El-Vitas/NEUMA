import type { CallToolResult } from '@modelcontextprotocol/server';
import { type AccessTokenPermission, type AccessTokenPlace, canAccessTokenAct } from '@neuma/shared';
import {
  MCP_CALL_OUTCOMES,
  MCP_INACCESSIBLE_MESSAGE,
  MCP_UNAUTHENTICATED_MESSAGE,
  MCP_UNEXPECTED_MESSAGE,
} from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpActor } from '../types/mcp.collections.types';
import type {
  McpCall,
  McpCallOutcome,
  McpPrincipal,
  McpRefusalReason,
  McpServerDependencies,
  McpWorkspace,
} from '../types/mcp.types';
import { buildMcpSearchScope, listMcpPageRuleProbes, permitsPageReading } from './mcp.access.lib';

export const readMcpActor = (call: McpCall): McpActor => ({
  role: call.principal.role,
  userId: call.principal.userId,
  workspaceId: call.workspace.id,
});

/** Resolved per call so revoking takes effect immediately. */
export const requireMcpPrincipal = async (dependencies: McpServerDependencies): Promise<McpPrincipal> => {
  const principal = await dependencies.principalResolver.resolve();
  if (principal === null) throw new McpToolError(MCP_UNAUTHENTICATED_MESSAGE);
  return principal;
};

/**
 * Rejects the call when the token's nearest rule does not grant the permission
 * there, or its owner no longer can. Answers as if the resource did not exist:
 * "no permission" would confirm something is there.
 */
export const requireMcpPermissionAt = (
  principal: McpPrincipal,
  place: AccessTokenPlace,
  permission: AccessTokenPermission,
): void => {
  if (!canAccessTokenAct(principal.access, principal.role, place, permission)) {
    throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  }
};

export const readMcpPlace = async (
  dependencies: McpServerDependencies,
  pageId: string,
  workspaceId: string,
): Promise<AccessTokenPlace> => {
  const place = await dependencies.placeReader.readPlace(pageId, workspaceId);
  if (place === null) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  return place;
};

/** A token only works in the workspace it was issued in. */
export const resolveMcpWorkspace = async (
  dependencies: McpServerDependencies,
  principal: McpPrincipal,
): Promise<McpWorkspace> => {
  const workspace = await dependencies.workspacesService.resolveForUser(principal.userId, principal.role);
  if (workspace.id !== principal.workspaceId) throw new McpToolError(MCP_UNAUTHENTICATED_MESSAGE);
  return workspace;
};

/** Scope comes from the token's grants, never from the agent's request, which only adds narrowing filters. */
export const openMcpCall = async (dependencies: McpServerDependencies): Promise<McpCall> => {
  const principal = await requireMcpPrincipal(dependencies);
  const [workspace, reach] = await Promise.all([
    resolveMcpWorkspace(dependencies, principal),
    dependencies.placeReader.resolvePageReach(
      listMcpPageRuleProbes(principal, permitsPageReading),
      principal.workspaceId,
    ),
  ]);
  return {
    principal,
    viewer: {
      role: principal.role,
      tokenScope: buildMcpSearchScope(principal, reach),
      userId: principal.userId,
      workspaceId: workspace.id,
    },
    workspace,
  };
};

/**
 * Success is sent as text (for the model) and as structure (for the host). Unexpected
 * failures are logged with their trace and the detail stays server side.
 */
export const runMcpTool = async <TOutput extends Record<string, unknown>>(
  dependencies: Pick<McpServerDependencies, 'observer'>,
  tool: string,
  action: () => Promise<TOutput>,
  formatText: (output: TOutput) => string = (output) => JSON.stringify(output),
): Promise<CallToolResult> => {
  const startedAt = performance.now();
  const finish = (outcome: McpCallOutcome, refusal?: McpRefusalReason): void => {
    const durationMs = Math.round(performance.now() - startedAt);
    dependencies.observer.callFinished({ durationMs, outcome, ...(refusal === undefined ? {} : { refusal }), tool });
  };
  try {
    const output = await action();
    const answer = { content: [{ text: formatText(output), type: 'text' as const }], structuredContent: output };
    finish(MCP_CALL_OUTCOMES.done);
    return answer;
  } catch (error) {
    if (error instanceof McpToolError) {
      finish(MCP_CALL_OUTCOMES.refused, error.reason);
      return { content: [{ text: error.message, type: 'text' as const }], isError: true };
    }
    dependencies.observer.unexpected(error, tool);
    finish(MCP_CALL_OUTCOMES.failed);
    return { content: [{ text: MCP_UNEXPECTED_MESSAGE, type: 'text' as const }], isError: true };
  }
};
