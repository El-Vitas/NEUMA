import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@company-brain/shared';
import { McpToolError } from '@/modules/mcp/infrastructure/errors/mcp.tool.error';
import { recordMcpWrite } from '@/modules/mcp/lib/mcp.actions.lib';
import type { McpActionEntry, McpCall, McpServerDependencies } from '@/modules/mcp/types/mcp.types';

const call: McpCall = {
  principal: {
    access: { allSpaces: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite], pages: [], spaces: [] },
    role: USER_ROLE.WORKER,
    tokenId: 'token-1',
    userId: 'user-1',
    workspaceId: 'workspace-1',
  },
  viewer: {
    role: USER_ROLE.WORKER,
    tokenScope: { allowedPageIds: [], closedPageIds: [], closedSpaceIds: [], openSpaceIds: [], readsEverywhere: false },
    userId: 'user-1',
    workspaceId: 'workspace-1',
  },
  workspace: { id: 'workspace-1', name: 'Company Brain' },
};

const request = { blockIds: [], detail: {}, pageId: 'page-1', tool: 'update_row' };

/** Un registro que guarda lo que se le anota, y que puede fallar al anotar. */
const createLog = (failsToRecord: boolean) => {
  const recorded: McpActionEntry[] = [];
  const dependencies: Pick<McpServerDependencies, 'actionLog'> = {
    actionLog: {
      record: (entry) => {
        recorded.push(entry);
        return failsToRecord ? Promise.reject(new Error('The log is down')) : Promise.resolve();
      },
    },
  };
  return { dependencies, recorded };
};

const outcomes = (recorded: readonly McpActionEntry[]) => recorded.map((entry) => entry.outcome);

describe('recordMcpWrite', () => {
  it('records a write that went through as done', async () => {
    const { dependencies, recorded } = createLog(false);

    await recordMcpWrite(dependencies, call, request, () => Promise.resolve('written'));

    expect(outcomes(recorded)).toEqual(['DONE']);
  });

  it('records a refusal the agent can read, and lets it reach the agent', async () => {
    const { dependencies, recorded } = createLog(false);

    const attempt = recordMcpWrite(dependencies, call, request, () => Promise.reject(new McpToolError('No.')));

    expect(attempt).rejects.toThrow('No.');
    await attempt.catch(() => undefined);
    expect(outcomes(recorded)).toEqual(['REFUSED']);
  });

  /** La escritura ya se hizo: anotarla después como fallida diría lo contrario de lo que pasó. */
  it('never records a write that went through as failed when the log itself fails', async () => {
    const { dependencies, recorded } = createLog(true);

    await recordMcpWrite(dependencies, call, request, () => Promise.resolve('written')).catch(() => undefined);

    expect(outcomes(recorded)).toEqual(['DONE']);
  });
});
