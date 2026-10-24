import { describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@neuma/shared';
import { MCP_ABANDONED_REQUEST_MS } from '@/modules/mcp/constants/mcp.constants';
import { McpRequestTakenError } from '@/modules/mcp/infrastructure/errors/mcp.request-taken.error';
import { McpToolError } from '@/modules/mcp/infrastructure/errors/mcp.tool.error';
import { recordMcpAttempt, recordMcpWrite } from '@/modules/mcp/lib/mcp.actions.lib';
import type {
  McpActionEntry,
  McpCall,
  McpLiveRequest,
  McpServerDependencies,
  McpWriteSession,
} from '@/modules/mcp/types/mcp.types';

const call: McpCall = {
  principal: {
    access: { allSpaces: [ACCESS_TOKEN_PERMISSIONS.collectionsWrite], pages: [], spaces: [] },
    role: USER_ROLE.WORKER,
    tokenId: 'token-1',
    userId: 'user-1',
    workspaceId: 'workspace-1',
  },
  readOutlineViewer: () => Promise.reject(new Error('Not used in this test')),
  viewer: { role: USER_ROLE.WORKER, userId: 'user-1', workspaceId: 'workspace-1' },
  workspace: { id: 'workspace-1', name: 'Neuma' },
};

const request = { blockIds: [], detail: {}, pageId: 'page-1', tool: 'update_row' };

const createLog = (
  fails: { readonly finishing?: boolean; readonly starting?: boolean; readonly taken?: boolean } = {},
  live: McpLiveRequest | null = null,
) => {
  const history: string[] = [];
  const entries: McpActionEntry[] = [];
  const unexpected: string[] = [];
  const dependencies: Pick<McpServerDependencies, 'actionLog' | 'observer'> = {
    actionLog: {
      finish: (actionId, outcome, createdPageId) => {
        if (fails.finishing === true) return Promise.reject(new Error('The log is down'));
        history.push(`${actionId}:${outcome}${createdPageId === undefined ? '' : `:${createdPageId}`}`);
        return Promise.resolve();
      },
      findLiveRequest: () => Promise.resolve(live),
      start: (entry) => {
        if (fails.starting === true) return Promise.reject(new Error('The log is down'));
        if (fails.taken === true && entry.requestId !== null)
          return Promise.reject(new McpRequestTakenError(entry.requestId));
        entries.push(entry);
        history.push('action-1:PENDING');
        return Promise.resolve('action-1');
      },
    },
    observer: { callFinished: () => undefined, unexpected: (_error, where) => unexpected.push(where) },
  };
  return { dependencies, entries, history, unexpected };
};

const attempt = { target: 'https://brain.example/spaces/s/pages/p', tool: 'update_row' };

describe('recordMcpAttempt', () => {
  it('writes down an attempt refused before any write, with what it pointed at', async () => {
    const { dependencies, entries, history } = createLog();

    const answer = recordMcpAttempt(dependencies, call, attempt, () => Promise.reject(new McpToolError('No.')));

    expect(answer).rejects.toThrow('No.');
    await answer.catch(() => undefined);
    expect(history).toEqual(['action-1:PENDING', 'action-1:REFUSED']);
    expect(entries[0]).toMatchObject({
      blockIds: [],
      detail: { target: attempt.target },
      pageId: null,
      tool: 'update_row',
    });
  });

  it('writes down an attempt that failed unexpectedly before any write as failed', async () => {
    const { dependencies, history } = createLog();

    const answer = recordMcpAttempt(dependencies, call, attempt, () => Promise.reject(new Error('Boom')));

    expect(answer).rejects.toThrow('Boom');
    await answer.catch(() => undefined);
    expect(history).toEqual(['action-1:PENDING', 'action-1:FAILED']);
  });

  it('does not write down twice a refusal that came after the write was written down', async () => {
    const { dependencies, history } = createLog();

    const answer = recordMcpAttempt(dependencies, call, attempt, (record) =>
      record(request, () => Promise.reject(new McpToolError('No.'))),
    );

    await answer.catch(() => undefined);
    expect(history).toEqual(['action-1:PENDING', 'action-1:REFUSED']);
  });

  it('keeps the real refusal for the agent when the attempt cannot be written down', async () => {
    const { dependencies, unexpected } = createLog({ starting: true });

    const answer = recordMcpAttempt(dependencies, call, attempt, () => Promise.reject(new McpToolError('No.')));

    expect(answer).rejects.toThrow('No.');
    await answer.catch(() => undefined);
    expect(unexpected).toEqual(['writing down a refused update_row']);
  });

  it('remembers the page a write created', async () => {
    const { dependencies, history } = createLog();

    await recordMcpAttempt(dependencies, call, attempt, (record) =>
      record(
        request,
        () => Promise.resolve({ id: 'new-page' }),
        (created) => created.id,
      ),
    );

    expect(history).toEqual(['action-1:PENDING', 'action-1:DONE:new-page']);
  });
});

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

  it('hands back a write that went through when its action cannot be closed, and reports it', async () => {
    const { dependencies, unexpected } = createLog({ finishing: true });

    const result = await recordMcpWrite(dependencies, call, request, () => Promise.resolve('written'));

    expect(result).toBe('written');
    expect(unexpected).toEqual(['closing agent action action-1 as DONE']);
  });
});

describe('recordMcpAttempt with a request id', () => {
  const retried = { ...attempt, requestId: 'request-1' };
  const writeOnce = (wasWritten: { count: number }) => (record: McpWriteSession['record']) =>
    record(request, () => {
      wasWritten.count += 1;
      return Promise.resolve('written');
    });

  it('writes the request id down with the action', async () => {
    const { dependencies, entries } = createLog();

    await recordMcpAttempt(dependencies, call, retried, writeOnce({ count: 0 }));

    expect(entries.map((entry) => entry.requestId)).toEqual(['request-1']);
  });

  it('refuses an id already used for another tool, saying so instead of claiming it was done', async () => {
    const other = { actionId: 'action-0', isDone: true, pageId: 'page-9', startedAt: new Date(), tool: 'create_page' };
    const { dependencies } = createLog({}, other);
    const wasWritten = { count: 0 };

    const answer = recordMcpAttempt(dependencies, call, retried, writeOnce(wasWritten));

    expect(answer).rejects.toThrow('create_page');
    await answer.catch(() => undefined);
    expect(wasWritten.count).toBe(0);
  });

  it('does not write again a request that was already done, and says where it landed', async () => {
    const done = { actionId: 'action-0', isDone: true, pageId: 'page-9', startedAt: new Date(), tool: 'update_row' };
    const { dependencies } = createLog({}, done);
    const wasWritten = { count: 0 };

    const answer = recordMcpAttempt(dependencies, call, retried, writeOnce(wasWritten));

    expect(answer).rejects.toThrow('page-9');
    await answer.catch(() => undefined);
    expect(wasWritten.count).toBe(0);
  });

  it('asks to wait when the same request is still under way', async () => {
    const running = { actionId: 'action-0', isDone: false, pageId: null, startedAt: new Date(), tool: 'update_row' };
    const { dependencies } = createLog({}, running);
    const wasWritten = { count: 0 };

    const answer = recordMcpAttempt(dependencies, call, retried, writeOnce(wasWritten));

    expect(answer).rejects.toThrow('still under way');
    await answer.catch(() => undefined);
    expect(wasWritten.count).toBe(0);
  });

  it('does not carry out a retry of a request left pending too long, and says how to tell', async () => {
    const longAgo = new Date(Date.now() - MCP_ABANDONED_REQUEST_MS - 1);
    const abandoned = { actionId: 'action-0', isDone: false, pageId: null, startedAt: longAgo, tool: 'update_row' };
    const { dependencies, history } = createLog({}, abandoned);
    const wasWritten = { count: 0 };

    const answer = recordMcpAttempt(dependencies, call, retried, writeOnce(wasWritten));

    expect(answer).rejects.toThrow('new request id');
    await answer.catch(() => undefined);
    expect(wasWritten.count).toBe(0);
    expect(history).not.toContain('action-0:FAILED');
  });

  it('does not write when another call took the same request id first', async () => {
    const { dependencies } = createLog({ taken: true });
    const wasWritten = { count: 0 };

    const answer = recordMcpAttempt(dependencies, call, retried, writeOnce(wasWritten));

    expect(answer).rejects.toThrow('still under way');
    await answer.catch(() => undefined);
    expect(wasWritten.count).toBe(0);
  });
});
