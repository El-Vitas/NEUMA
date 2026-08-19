import { describe, expect, test } from 'bun:test';
import { USER_ROLE, type UserRole } from '@company-brain/shared';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import type { SearchPage, SearchQuery } from '../../../../src/common/types/search.types';
import type { WorkspaceSummary } from '../../../../src/common/types/workspace.types';
import { createMcpServer } from '../../../../src/modules/mcp/mcp.server';
import type {
  McpPageReadResult,
  McpPrincipal,
  McpServerDependencies,
} from '../../../../src/modules/mcp/types/mcp.types';
import type { PageSummary } from '../../../../src/modules/pages/types/page.types';
import type { SpaceSummary } from '../../../../src/modules/spaces/types/space.types';

const principal: McpPrincipal = { role: USER_ROLE.WORKER, userId: 'user-1' };
const workspace: WorkspaceSummary = { id: 'workspace-1', name: 'Company Brain' };
const spaces: readonly SpaceSummary[] = [
  { icon: null, id: 'space-1', name: 'Engineering', order: 0, slug: 'engineering', visibility: 'PUBLIC_INTERNAL' },
];
const page: PageSummary = {
  content: {
    content: [{ content: [{ text: 'Run this first', type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: '11111111-1111-4111-8111-111111111111',
  lifecycle: 'ACTIVE',
  lockedAt: null,
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: 'space-1',
  title: 'Runbook',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
};

const searchPage: SearchPage = {
  items: [
    {
      contentType: 'PAGE',
      rank: 0.91,
      spaceId: 'space-1',
      sourceId: page.id,
      sourceType: 'PAGE',
      snippet: '<mark>Runbook</mark> content',
      title: 'Runbook',
      updatedAt: '2026-08-02T12:00:00.000Z',
    },
  ],
  nextCursor: 'next-page-cursor',
};

const createDependencies = (resolvedPrincipal: McpPrincipal | null = principal): McpServerDependencies => ({
  principalResolver: { resolve: () => Promise.resolve(resolvedPrincipal) },
  workspacesService: { resolveForUser: () => Promise.resolve(workspace) },
  spacesService: { listAccessible: () => Promise.resolve(spaces) },
  pagesService: {
    getAccessible: (pageId) => Promise.resolve(createPageReadResult(pageId === page.id ? page : null)),
  },
  searchService: { search: () => Promise.resolve(searchPage) },
});

const createPageReadResult = (pageSummary: PageSummary | null): McpPageReadResult => ({
  getValue: () => {
    if (pageSummary === null) throw new Error('No page');
    return pageSummary;
  },
  isFail: () => pageSummary === null,
});

const connectClient = async (dependencies: McpServerDependencies): Promise<Client> => {
  const serverTransportPair = InMemoryTransport.createLinkedPair();
  const server = createMcpServer(dependencies);
  const client = new Client({ name: 'mcp-contract-test', version: '1.0.0' });
  await server.connect(serverTransportPair[1]);
  await client.connect(serverTransportPair[0]);
  return client;
};

const createErrorReportingClient = async (
  overrides: Partial<McpServerDependencies> = {},
): Promise<{ readonly client: Client; readonly reportedErrors: unknown[] }> => {
  const reportedErrors: unknown[] = [];
  const client = await connectClient({
    ...createDependencies(),
    errorReporter: { report: (error) => reportedErrors.push(error) },
    ...overrides,
  });
  return { client, reportedErrors };
};

type ToolResult = { readonly content: readonly unknown[]; readonly isError?: boolean | undefined };

const expectInputValidationError = (result: ToolResult): void => {
  expect(result.isError).toBe(true);
  expect(result.content[0]).toMatchObject({ type: 'text' });
  expect((result.content[0] as { text: string }).text).toContain('Input validation error');
};

describe('MCP read contract', () => {
  test('registers only authorized read tools', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toEqual(['mcp.listSpaces', 'mcp.getPage', 'search_company_brain']);
  });

  test('lists spaces using the resolved authenticated principal', async () => {
    const calls: string[] = [];
    let resolvePrincipal = (): Promise<McpPrincipal | null> => Promise.resolve(principal);
    let resolveWorkspace = (_userId: string, _role: UserRole): Promise<WorkspaceSummary> => Promise.resolve(workspace);
    let listSpaces = (_workspaceId: string, _userId: string, _role: UserRole): Promise<readonly SpaceSummary[]> =>
      Promise.resolve(spaces);
    const dependencies: McpServerDependencies = {
      principalResolver: { resolve: () => resolvePrincipal() },
      workspacesService: { resolveForUser: (userId, role) => resolveWorkspace(userId, role) },
      spacesService: { listAccessible: (workspaceId, userId, role) => listSpaces(workspaceId, userId, role) },
      pagesService: {
        getAccessible: (pageId) => Promise.resolve(createPageReadResult(pageId === page.id ? page : null)),
      },
      searchService: { search: () => Promise.resolve(searchPage) },
    };
    resolvePrincipal = () => {
      calls.push('principal');
      return Promise.resolve(principal);
    };
    resolveWorkspace = (userId: string, role: UserRole) => {
      calls.push(`workspace:${userId}:${role}`);
      return Promise.resolve(workspace);
    };
    listSpaces = (workspaceId: string, userId: string, role: UserRole) => {
      calls.push(`spaces:${workspaceId}:${userId}:${role}`);
      return Promise.resolve(spaces);
    };
    const client = await connectClient(dependencies);

    const result = await client.callTool({ name: 'mcp.listSpaces', arguments: {} });

    expect(result.isError).not.toBe(true);
    /** An agent is told which spaces it may read — not how they are drawn, nor in what order a person arranged them. */
    expect(result.structuredContent).toEqual({
      spaces: spaces.map(({ icon: _icon, order: _order, ...readable }) => readable),
    });
    expect(calls).toEqual(['principal', 'workspace:user-1:WORKER', 'spaces:workspace-1:user-1:WORKER']);
  });

  test('gets a page through the direct authorized page read', async () => {
    const calls: string[] = [];
    let getPage = (
      _pageId: string,
      _workspaceId: string,
      _userId: string,
      _role: UserRole,
    ): Promise<McpPageReadResult> => Promise.resolve(createPageReadResult(page));
    const dependencies: McpServerDependencies = {
      ...createDependencies(),
      pagesService: {
        getAccessible: (pageId, workspaceId, userId, role) => getPage(pageId, workspaceId, userId, role),
      },
      searchService: { search: () => Promise.resolve(searchPage) },
    };
    getPage = (pageId: string, workspaceId: string, userId: string, role: UserRole) => {
      calls.push(`${pageId}:${workspaceId}:${userId}:${role}`);
      return Promise.resolve(createPageReadResult(page));
    };
    const client = await connectClient(dependencies);

    const result = await client.callTool({ name: 'mcp.getPage', arguments: { pageId: page.id } });
    const expectedPage = {
      content: page.content,
      id: page.id,
      lifecycle: page.lifecycle,
      order: page.order,
      parentId: page.parentId,
      spaceId: page.spaceId,
      title: page.title,
      version: page.version,
    };

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ page: expectedPage });
    expect(calls).toEqual(['11111111-1111-4111-8111-111111111111:workspace-1:user-1:WORKER']);
  });

  test('does not reveal whether an inaccessible page exists', async () => {
    const client = await connectClient(createDependencies());

    const missing = await client.callTool({
      name: 'mcp.getPage',
      arguments: { pageId: '22222222-2222-4222-8222-222222222222' },
    });
    const inaccessible = await client.callTool({
      name: 'mcp.getPage',
      arguments: { pageId: '33333333-3333-4333-8333-333333333333' },
    });

    expect(missing.isError).toBe(true);
    expect(inaccessible.isError).toBe(true);
    expect(missing.content).toEqual([{ type: 'text', text: 'Resource not accessible.' }]);
    expect(inaccessible.content).toEqual([{ type: 'text', text: 'Resource not accessible.' }]);
  });

  test('rejects requests without an authenticated principal', async () => {
    const client = await connectClient(createDependencies(null));

    const result = await client.callTool({ name: 'mcp.listSpaces', arguments: {} });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: 'Resource not accessible.' }]);
  });

  test('searches through SearchService with the authenticated principal and filters', async () => {
    let receivedQuery: SearchQuery | undefined;
    const client = await connectClient({
      ...createDependencies(),
      searchService: {
        search: (query) => {
          receivedQuery = query;
          return Promise.resolve(searchPage);
        },
      },
    });

    const result = await client.callTool({
      name: 'search_company_brain',
      arguments: {
        query: 'runbook',
        limit: 10,
        spaceId: 'space-1',
        sourceType: 'PAGE',
        contentType: 'PAGE',
        tags: ['operations', 'runbook'],
        cursor: 'cursor-1',
      },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(searchPage);
    expect(receivedQuery).toEqual({
      contentType: 'PAGE',
      cursor: 'cursor-1',
      limit: 10,
      query: 'runbook',
      sourceType: 'PAGE',
      spaceId: 'space-1',
      tags: ['operations', 'runbook'],
      userId: 'user-1',
      userRole: USER_ROLE.WORKER,
      workspaceId: 'workspace-1',
    });
  });

  test('returns concise text and the next cursor for search results', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.callTool({
      name: 'search_company_brain',
      arguments: { query: 'runbook' },
    });

    expect(result.content).toEqual([
      {
        type: 'text',
        text: 'Runbook [PAGE/PAGE] in space-1\n<mark>Runbook</mark> content\nNext cursor: next-page-cursor',
      },
    ]);
    expect(result.structuredContent).toEqual(searchPage);
  });

  test('returns parsed search output rather than raw service data', async () => {
    const rawSearchPage = { ...searchPage, internalDebugValue: 'must not cross MCP boundary' };
    const client = await connectClient({
      ...createDependencies(),
      searchService: { search: () => Promise.resolve(rawSearchPage) },
    });

    const result = await client.callTool({ name: 'search_company_brain', arguments: { query: 'runbook' } });

    expect(result.structuredContent).toEqual(searchPage);
    expect(result.content).toEqual([
      {
        type: 'text',
        text: 'Runbook [PAGE/PAGE] in space-1\n<mark>Runbook</mark> content\nNext cursor: next-page-cursor',
      },
    ]);
  });

  test('rejects an empty search query', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.callTool({ name: 'search_company_brain', arguments: { query: '' } });

    expectInputValidationError(result);
  });

  test('rejects an oversized search query', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.callTool({
      name: 'search_company_brain',
      arguments: { query: 'x'.repeat(201) },
    });

    expectInputValidationError(result);
  });

  test('does not search without an authenticated principal', async () => {
    let searchCalled = false;
    const client = await connectClient({
      ...createDependencies(null),
      searchService: {
        search: () => {
          searchCalled = true;
          return Promise.resolve(searchPage);
        },
      },
    });

    const result = await client.callTool({ name: 'search_company_brain', arguments: { query: 'runbook' } });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: 'Resource not accessible.' }]);
    expect(searchCalled).toBe(false);
  });

  test('does not report expected inaccessible errors', async () => {
    const { client, reportedErrors } = await createErrorReportingClient();

    const result = await client.callTool({
      name: 'mcp.getPage',
      arguments: { pageId: '22222222-2222-4222-8222-222222222222' },
    });

    expect(result.content).toEqual([{ type: 'text', text: 'Resource not accessible.' }]);
    expect(reportedErrors).toHaveLength(0);
  });

  test('reports unexpected search failures without exposing details', async () => {
    const { client, reportedErrors } = await createErrorReportingClient({
      searchService: { search: () => Promise.reject(new Error('database unavailable')) },
    });

    const result = await client.callTool({ name: 'search_company_brain', arguments: { query: 'runbook' } });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: 'Resource not accessible.' }]);
    expect(reportedErrors).toHaveLength(1);
  });

  test('reports operational failures without exposing them to the client', async () => {
    const { client, reportedErrors } = await createErrorReportingClient({
      spacesService: { listAccessible: () => Promise.reject(new Error('database unavailable')) },
    });

    const result = await client.callTool({ name: 'mcp.listSpaces', arguments: {} });

    expect(result.content).toEqual([{ type: 'text', text: 'Resource not accessible.' }]);
    expect(reportedErrors).toHaveLength(1);
  });

  test('rejects page content outside the foundation contract', async () => {
    const invalidPage = {
      ...page,
      content: {
        content: [{ content: [{ text: 'Still a paragraph', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 2,
        type: 'doc',
      },
    };
    const client = await connectClient({
      ...createDependencies(),
      pagesService: { getAccessible: () => Promise.resolve(createPageReadResult(invalidPage)) },
    });

    const result = await client.callTool({ name: 'mcp.getPage', arguments: { pageId: page.id } });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: 'Resource not accessible.' }]);
  });
});
