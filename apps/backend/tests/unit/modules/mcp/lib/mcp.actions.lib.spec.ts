import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@company-brain/shared';
import { McpToolError } from '@/modules/mcp/infrastructure/errors/mcp.tool.error';
import { recordMcpWrite } from '@/modules/mcp/lib/mcp.actions.lib';
import type { McpCall, McpServerDependencies } from '@/modules/mcp/types/mcp.types';

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

/** Un registro que anota en memoria, y que puede fallar al abrir o al cerrar una acción. */
const createLog = (fails: { readonly finishing?: boolean; readonly starting?: boolean } = {}) => {
  const history: string[] = [];
  const unexpected: string[] = [];
  const dependencies: Pick<McpServerDependencies, 'actionLog' | 'observer'> = {
    actionLog: {
      finish: (actionId, outcome) => {
        if (fails.finishing === true) return Promise.reject(new Error('The log is down'));
        history.push(`${actionId}:${outcome}`);
        return Promise.resolve();
      },
      start: () => {
        if (fails.starting === true) return Promise.reject(new Error('The log is down'));
        history.push('action-1:PENDING');
        return Promise.resolve('action-1');
      },
    },
    observer: { callFinished: () => undefined, unexpected: (_error, where) => unexpected.push(where) },
  };
  return { dependencies, history, unexpected };
};

describe('recordMcpWrite', () => {
  it('writes the action down before writing, and closes it as done', async () => {
    const { dependencies, history } = createLog();

    await recordMcpWrite(dependencies, call, request, () => Promise.resolve('written'));

    expect(history).toEqual(['action-1:PENDING', 'action-1:DONE']);
  });

  it('closes a refusal the agent can read as refused, and lets it reach the agent', async () => {
    const { dependencies, history } = createLog();

    const attempt = recordMcpWrite(dependencies, call, request, () => Promise.reject(new McpToolError('No.')));

    expect(attempt).rejects.toThrow('No.');
    await attempt.catch(() => undefined);
    expect(history).toEqual(['action-1:PENDING', 'action-1:REFUSED']);
  });

  /** Sin anotación no hay escritura. */
  it('never writes when the action cannot be written down first', async () => {
    const { dependencies } = createLog({ starting: true });
    let wasWritten = false;

    const attempt = recordMcpWrite(dependencies, call, request, () => {
      wasWritten = true;
      return Promise.resolve('written');
    });

    expect(attempt).rejects.toThrow('The log is down');
    await attempt.catch(() => undefined);
    expect(wasWritten).toBe(false);
  });

  /** La escritura ya se hizo: decirle al agente que falló lo haría repetirla. Queda pendiente y se avisa. */
  it('hands back a write that went through when its action cannot be closed, and reports it', async () => {
    const { dependencies, unexpected } = createLog({ finishing: true });

    const result = await recordMcpWrite(dependencies, call, request, () => Promise.resolve('written'));

    expect(result).toBe('written');
    expect(unexpected).toEqual(['closing agent action action-1 as DONE']);
  });
});
