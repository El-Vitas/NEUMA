import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@neuma/shared';
import { MCP_REFUSAL_REASONS } from '@/modules/mcp/constants/mcp.constants';
import { McpToolError } from '@/modules/mcp/infrastructure/errors/mcp.tool.error';
import { openMcpCall, runMcpTool } from '@/modules/mcp/lib/mcp.tool.lib';
import type { McpFinishedCall, McpPrincipal, McpServerDependencies } from '@/modules/mcp/types/mcp.types';

const watchCalls = () => {
  const finished: Omit<McpFinishedCall, 'durationMs'>[] = [];
  const dependencies: Pick<McpServerDependencies, 'observer'> = {
    observer: {
      callFinished: ({ durationMs: _durationMs, ...call }: McpFinishedCall) => {
        finished.push(call);
      },
      unexpected: () => undefined,
    },
  };
  return { dependencies, finished };
};

const buildCallDependencies = () => {
  const reachQueries: string[] = [];
  const principal: McpPrincipal = {
    access: {
      allSpaces: [],
      pages: [{ pageId: 'page-1', permissions: [ACCESS_TOKEN_PERMISSIONS.pagesRead] }],
      spaces: [],
    },
    role: USER_ROLE.WORKER,
    tokenId: 'token-1',
    userId: 'user-1',
    workspaceId: 'workspace-1',
  };
  const dependencies: Pick<McpServerDependencies, 'placeReader' | 'principalResolver' | 'workspacesService'> = {
    placeReader: {
      readPlace: () => Promise.resolve(null),
      readPlaces: () => Promise.resolve(new Map()),
      resolvePageReach: (_rules, workspaceId) => {
        reachQueries.push(workspaceId);
        return Promise.resolve({ allowedPageIds: ['page-1'], closedPageIds: [], spaceIdsWithAllowedPages: [] });
      },
    },
    principalResolver: { resolve: () => Promise.resolve(principal) },
    workspacesService: { resolveForUser: () => Promise.resolve({ id: 'workspace-1', name: 'Neuma' }) },
  };
  return { dependencies, reachQueries };
};

describe('openMcpCall', () => {
  it('does not walk the pages the token reaches until a tool asks for them', async () => {
    const { dependencies, reachQueries } = buildCallDependencies();

    await openMcpCall(dependencies);

    expect(reachQueries).toEqual([]);
  });

  it('walks them once however many times the outline viewer is asked for', async () => {
    const { dependencies, reachQueries } = buildCallDependencies();
    const call = await openMcpCall(dependencies);

    const [first, second] = await Promise.all([call.readOutlineViewer(), call.readOutlineViewer()]);

    expect(reachQueries).toEqual(['workspace-1']);
    expect(first.tokenScope.allowedPageIds).toEqual(['page-1']);
    expect(second).toBe(first);
  });
});

describe('runMcpTool', () => {
  it('tells why a call was refused, and never the message the agent reads', async () => {
    const { dependencies, finished } = watchCalls();

    const answer = await runMcpTool(dependencies, 'insert_blocks', () =>
      Promise.reject(new McpToolError('Block 1: "secreto" cannot be drawn', MCP_REFUSAL_REASONS.diagram)),
    );

    expect(answer).toEqual({
      content: [{ text: 'Block 1: "secreto" cannot be drawn', type: 'text' }],
      isError: true,
    });
    expect(finished).toEqual([{ outcome: 'REFUSED', refusal: 'diagram', tool: 'insert_blocks' }]);
  });

  it('leaves the reason out when the refusal gives none', async () => {
    const { dependencies, finished } = watchCalls();

    await runMcpTool(dependencies, 'fetch', () => Promise.reject(new McpToolError('No such page')));

    expect(finished).toEqual([{ outcome: 'REFUSED', tool: 'fetch' }]);
  });
});
