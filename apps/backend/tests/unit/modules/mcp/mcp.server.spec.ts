import { afterAll, beforeAll, describe, expect, setSystemTime, test } from 'bun:test';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { ACCESS_TOKEN_PERMISSIONS, type PagePropertyType, Result, USER_ROLE, type UserRole } from '@neuma/shared';
import { z } from 'zod';
import type { AccessTokenPlaceReader } from '../../../../src/common/types/access-token.types';
import type {
  PageBlockSearchPage,
  PageBlockSearchQuery,
  SearchPage,
  SearchQuery,
} from '../../../../src/common/types/search.types';
import type { WorkspaceSummary } from '../../../../src/common/types/workspace.types';
import {
  MCP_BLOCK_NOT_FOUND_NOTE,
  MCP_FETCHED_IN_TRASH_NOTE,
  MCP_INACCESSIBLE_MESSAGE,
  MCP_LIST_PAGES_PLACE_MESSAGE,
  MCP_REDACTED_REFERENCE_LABEL,
  MCP_UNAUTHENTICATED_MESSAGE,
  MCP_UNEXPECTED_MESSAGE,
  MCP_UNREADABLE_ADDRESS_MESSAGE,
  MCP_UNREADABLE_PAGE_MESSAGE,
} from '../../../../src/modules/mcp/constants/mcp.constants';
import { MCP_FETCH_CHILD_LIMIT } from '../../../../src/modules/mcp/constants/mcp.limits.constants';
import { writeMcpServerInstructions } from '../../../../src/modules/mcp/lib/mcp.instructions.lib';
import { createMcpServer } from '../../../../src/modules/mcp/mcp.server';
import type { McpCollectionService, McpColumn } from '../../../../src/modules/mcp/types/mcp.collections.types';
import type {
  McpOutlineEntry,
  McpOutlineReader,
  McpPageReadResult,
  McpPrincipal,
  McpServerDependencies,
} from '../../../../src/modules/mcp/types/mcp.types';
import type { PageSummary } from '../../../../src/modules/pages/types/page.types';
import type { SpaceSummary } from '../../../../src/modules/spaces/types/space.types';
import { createOpenBlockAccess } from '../../../helpers/mcp.block-access.helper';
import { createUnusedPageManager } from '../../../helpers/mcp.page-manager.helper';

const PORTAL = 'https://brain.example.com';
const SPACE = '00000000-0000-4000-8000-00000000000a';
const PAGE = '11111111-1111-4111-8111-111111111111';
const BLOCK = '44444444-4444-4444-8444-444444444444';
const HIDDEN_PAGE = '55555555-5555-4555-8555-555555555555';
const MISSING = '22222222-2222-4222-8222-222222222222';

const principal: McpPrincipal = {
  access: {
    allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsRead],
    pages: [],
    spaces: [],
  },
  role: USER_ROLE.WORKER,
  tokenId: 'token-1',
  userId: 'user-1',
  workspaceId: 'workspace-1',
};
const workspace: WorkspaceSummary = { id: 'workspace-1', name: 'Neuma' };
const spaces: readonly SpaceSummary[] = [
  {
    description: null,
    icon: null,
    id: SPACE,
    name: 'Engineering',
    order: 0,
    ownerId: null,
    slug: 'engineering',
    visibility: 'PUBLIC_INTERNAL',
  },
];
const page: PageSummary = {
  content: {
    content: [
      { attrs: { id: 'heading-1', level: 1 }, content: [{ text: 'Setup', type: 'text' }], type: 'heading' },
      {
        attrs: { id: BLOCK },
        content: [
          { text: 'Run this first, see ', type: 'text' },
          { attrs: { label: 'Salaries', pageId: HIDDEN_PAGE, spaceId: SPACE }, type: 'mention' },
        ],
        type: 'paragraph',
      },
    ],
    schemaVersion: 1,
    type: 'doc',
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: PAGE,
  lifecycle: 'ACTIVE',
  lockedAt: null,
  order: 0,
  owner: null,
  parentId: null,
  propertyValues: null,
  spaceId: SPACE,
  title: 'Runbook',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 3,
};

const CLOSED_PARENT_TITLE = 'Despidos 2027';

const blockHits: PageBlockSearchPage = {
  items: [
    {
      blockId: BLOCK,
      blockType: 'paragraph',
      headingPath: ['Setup'],
      isPageVerified: true,
      pageId: PAGE,
      pageTitle: 'Runbook',
      parentPageTitle: CLOSED_PARENT_TITLE,
      rank: 0.9,
      snippet: '<mark>Run</mark> this first',
      spaceId: SPACE,
      spaceName: 'Engineering',
    },
  ],
  nextCursor: 'next-block-cursor',
};

const pageHits: SearchPage = {
  items: [
    {
      contentType: 'PAGE',
      isVerified: true,
      rank: 0.5,
      spaceId: SPACE,
      sourceId: PAGE,
      sourceType: 'PAGE',
      snippet: '<mark>Runbook</mark>',
      title: 'Runbook',
      updatedAt: '2026-08-02T12:00:00.000Z',
    },
    {
      contentType: 'PAGE',
      isVerified: false,
      rank: 0.4,
      spaceId: SPACE,
      sourceId: MISSING,
      sourceType: 'PAGE',
      snippet: '<mark>Runbooks</mark> index',
      title: 'Runbooks',
      updatedAt: '2026-08-02T12:00:00.000Z',
    },
  ],
};

const placeReader: AccessTokenPlaceReader = {
  readPlace: (pageId) => Promise.resolve({ lineage: [pageId], spaceId: SPACE }),
  readPlaces: (pageIds) =>
    Promise.resolve(new Map(pageIds.map((pageId) => [pageId, { lineage: [pageId], spaceId: SPACE }]))),
  resolvePageReach: () => Promise.resolve({ allowedPageIds: [], closedPageIds: [], spaceIdsWithAllowedPages: [] }),
};

const childrenOf =
  (all: readonly McpOutlineEntry[]): McpOutlineReader['listChildren'] =>
  (_spaceId, _parentId, _viewer, window) =>
    Promise.resolve({ entries: all.slice(window.skip, window.skip + window.take), total: all.length });

const outline: McpOutlineReader = {
  listAncestors: () => Promise.resolve([]),
  listChildren: childrenOf([
    { childCount: 2, id: MISSING, isCollection: true, propertyValues: null, title: 'Incidents' },
  ]),
  listReadable: (pageIds) =>
    Promise.resolve(pageIds.filter((id) => id === PAGE).map((id) => ({ id, spaceId: SPACE, title: 'Runbook' }))),
};

const createPageReadResult = (pageSummary: PageSummary | null): McpPageReadResult =>
  pageSummary === null ? Result.fail(new Error('No page')) : Result.ok(pageSummary);

const createDependencies = (resolvedPrincipal: McpPrincipal | null = principal): McpServerDependencies => ({
  actionLog: {
    findLiveRequest: () => Promise.resolve(null),
    finish: () => Promise.resolve(),
    start: () => Promise.resolve('action-1'),
  },
  backlinks: { listBacklinks: () => Promise.resolve({ items: [] }) },
  blockAccess: createOpenBlockAccess(),
  collections: collectionWith([]),
  content: { edit: notUsedHere },
  drawings: { checkDiagram: notUsedHere, checkFormula: () => Result.ok('') },
  pages: createUnusedPageManager(),
  observer: { callFinished: () => undefined, unexpected: () => undefined },
  outline,
  pagesService: {
    getAccessible: (pageId) => Promise.resolve(createPageReadResult(pageId === PAGE ? page : null)),
  },
  people: { listAssignableMembers: () => Promise.resolve([{ id: 'u-1', name: 'Ana Pérez' }]) },
  placeReader,
  portalUrl: PORTAL,
  principalResolver: { resolve: () => Promise.resolve(resolvedPrincipal) },
  rows: { create: notUsedHere, rename: notUsedHere, updateProperties: notUsedHere },
  searchService: {
    locateBlock: (blockId) => Promise.resolve(blockId === BLOCK ? [PAGE] : []),
    search: () => Promise.resolve(pageHits),
    searchBlocks: () => Promise.resolve(blockHits),
  },
  spacesService: { listAccessible: () => Promise.resolve(spaces) },
  workspacesService: { resolveForUser: () => Promise.resolve(workspace) },
});

const notUsedHere = (): Promise<never> => Promise.reject(new Error('Not used in this test'));

const column = (key: string, label: string, type: PagePropertyType): McpColumn => ({
  key,
  label,
  options: null,
  required: false,
  type,
});

const collectionWith = (properties: readonly McpColumn[]): McpCollectionService => ({
  defineSchema: notUsedHere,
  getSchema: () => Promise.resolve(Result.ok({ properties, views: [] })),
  queryRows: notUsedHere,
  rewriteOption: notUsedHere,
  setViewConfiguration: notUsedHere,
});

const servingPage = (served: PageSummary, overrides: Partial<McpServerDependencies> = {}): McpServerDependencies => ({
  ...createDependencies(),
  pagesService: { getAccessible: () => Promise.resolve(createPageReadResult(served)) },
  ...overrides,
});

const connectClient = async (dependencies: McpServerDependencies): Promise<Client> => {
  const serverTransportPair = InMemoryTransport.createLinkedPair();
  const server = createMcpServer(dependencies, await dependencies.principalResolver.resolve());
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
    observer: { callFinished: () => undefined, unexpected: (error) => reportedErrors.push(error) },
    ...overrides,
  });
  return { client, reportedErrors };
};

type ToolResult = { readonly content: readonly unknown[]; readonly isError?: boolean | undefined };

const textOf = (result: ToolResult): string => (result.content[0] as { text: string }).text;

const expectInputValidationError = (result: ToolResult): void => {
  expect(result.isError).toBe(true);
  expect(result.content[0]).toMatchObject({ type: 'text' });
  expect(textOf(result)).toContain('Input validation error');
};

const fetchAddress = async (address: string, dependencies = createDependencies()) =>
  (await connectClient(dependencies)).callTool({ arguments: { address }, name: 'fetch' });

describe('MCP read contract', () => {
  test('offers a read-only token the read tools only, starting with the one to use first', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toEqual([
      'search',
      'fetch',
      'list_spaces',
      'list_pages',
      'list_trash',
      'get_collection',
      'query_collection',
    ]);
  });

  test('tells the agent what the brain is before it calls anything', async () => {
    const client = await connectClient(createDependencies());

    expect(client.getInstructions()).toBe(writeMcpServerInstructions(PORTAL));
  });

  test('tells the agent which links are Neuma links, and that its tasks live there', async () => {
    const client = await connectClient(createDependencies());

    expect(client.getInstructions()).toContain(`Links that start with ${PORTAL}`);
    expect(client.getInstructions()).toContain('tasks');
  });

  test('lists spaces using the resolved authenticated principal', async () => {
    const calls: string[] = [];
    const dependencies: McpServerDependencies = {
      ...createDependencies(),
      principalResolver: {
        resolve: () => {
          calls.push('principal');
          return Promise.resolve(principal);
        },
      },
      spacesService: {
        listAccessible: (workspaceId, userId, role) => {
          calls.push(`spaces:${workspaceId}:${userId}:${role}`);
          return Promise.resolve(spaces);
        },
      },
      workspacesService: {
        resolveForUser: (userId: string, role: UserRole) => {
          calls.push(`workspace:${userId}:${role}`);
          return Promise.resolve(workspace);
        },
      },
    };
    const client = await connectClient(dependencies);

    const result = await client.callTool({ arguments: {}, name: 'list_spaces' });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      spaces: spaces.map(
        ({ description: _description, icon: _icon, order: _order, ownerId: _ownerId, ...readable }) => readable,
      ),
    });
    // Once when building the server (to pick the tools) and once per call, so revoking cuts access at once.
    expect(calls).toEqual(['principal', 'principal', 'workspace:user-1:WORKER', `spaces:workspace-1:user-1:WORKER`]);
  });

  test('tells the agent its token no longer works when there is no authenticated principal', async () => {
    const client = await connectClient(createDependencies(null));

    const result = await client.callTool({ arguments: {}, name: 'list_spaces' });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ text: MCP_UNAUTHENTICATED_MESSAGE, type: 'text' }]);
  });

  test('reports operational failures without exposing them to the client', async () => {
    const { client, reportedErrors } = await createErrorReportingClient({
      spacesService: { listAccessible: () => Promise.reject(new Error('database unavailable')) },
    });

    const result = await client.callTool({ arguments: {}, name: 'list_spaces' });

    expect(result.content).toEqual([{ text: MCP_UNEXPECTED_MESSAGE, type: 'text' }]);
    expect(reportedErrors).toHaveLength(1);
  });

  test('tells how every call ended, whether it went through, was refused or failed', async () => {
    const finished: string[] = [];
    const client = await connectClient({
      ...createDependencies(),
      observer: { callFinished: (call) => finished.push(`${call.tool}:${call.outcome}`), unexpected: () => undefined },
      spacesService: { listAccessible: () => Promise.reject(new Error('database unavailable')) },
    });

    await client.callTool({ arguments: { address: PAGE }, name: 'fetch' });
    await client.callTool({ arguments: { address: MISSING }, name: 'fetch' });
    await client.callTool({ arguments: {}, name: 'list_spaces' });

    expect(finished).toEqual(['fetch:DONE', 'fetch:REFUSED', 'list_spaces:FAILED']);
  });
});

describe('MCP search', () => {
  test('searches blocks and page titles as the person, within what the token reads, with the filters asked for', async () => {
    const blockQueries: PageBlockSearchQuery[] = [];
    const pageQueries: SearchQuery[] = [];
    const client = await connectClient({
      ...createDependencies(),
      searchService: {
        ...createDependencies().searchService,
        search: (query) => {
          pageQueries.push(query);
          return Promise.resolve(pageHits);
        },
        searchBlocks: (query) => {
          blockQueries.push(query);
          return Promise.resolve(blockHits);
        },
      },
    });

    const result = await client.callTool({ arguments: { limit: 10, query: 'run', spaceId: SPACE }, name: 'search' });

    expect(result.isError).not.toBe(true);
    const readsEverywhere = {
      allowedPageIds: [],
      closedPageIds: [],
      closedSpaceIds: [],
      openSpaceIds: [],
      readsEverywhere: true,
    };
    expect(blockQueries).toEqual([
      {
        limit: 10,
        query: 'run',
        spaceId: SPACE,
        tokenScope: readsEverywhere,
        userId: 'user-1',
        userRole: USER_ROLE.WORKER,
        workspaceId: 'workspace-1',
      },
    ]);
    expect(pageQueries[0]).toMatchObject({ sourceType: 'PAGE', spaceId: SPACE, tokenScope: readsEverywhere });
  });

  test('answers with each block, its page, section and link, and the pages that only matched by title', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.callTool({ arguments: { query: 'run' }, name: 'search' });

    expect(result.structuredContent).toEqual({
      blocks: [
        {
          blockId: BLOCK,
          blockType: 'paragraph',
          isPageVerified: true,
          pageId: PAGE,
          pageTitle: 'Runbook',
          section: ['Setup'],
          snippet: '<mark>Run</mark> this first',
          spaceId: SPACE,
          spaceName: 'Engineering',
          url: `${PORTAL}/spaces/${SPACE}/pages/${PAGE}#${BLOCK}`,
        },
      ],
      nextCursor: 'next-block-cursor',
      pages: [
        {
          isVerified: false,
          pageId: MISSING,
          snippet: '<mark>Runbooks</mark> index',
          spaceId: SPACE,
          title: 'Runbooks',
          url: `${PORTAL}/spaces/${SPACE}/pages/${MISSING}`,
        },
      ],
    });
    expect(textOf(result)).toContain(`Runbook › Setup (paragraph, block ${BLOCK}, verified page)`);
    expect(textOf(result)).toContain('More blocks with cursor: next-block-cursor');
  });

  test('never names the page above a hit, which the token may not be allowed to read', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.callTool({ arguments: { query: 'run' }, name: 'search' });

    expect(JSON.stringify(result)).not.toContain(CLOSED_PARENT_TITLE);
  });

  test('searches under a page only when the agent can see that page, and says nothing about it otherwise', async () => {
    const client = await connectClient(createDependencies());

    const refused = await client.callTool({ arguments: { pageId: HIDDEN_PAGE, query: 'run' }, name: 'search' });

    expect(refused.content).toEqual([{ text: MCP_INACCESSIBLE_MESSAGE, type: 'text' }]);
  });

  test('rejects an empty or oversized query', async () => {
    const client = await connectClient(createDependencies());

    expectInputValidationError(await client.callTool({ arguments: { query: '' }, name: 'search' }));
    expectInputValidationError(await client.callTool({ arguments: { query: 'x'.repeat(201) }, name: 'search' }));
  });

  test('does not search without an authenticated principal', async () => {
    let searched = false;
    const client = await connectClient({
      ...createDependencies(null),
      searchService: {
        ...createDependencies().searchService,
        searchBlocks: () => {
          searched = true;
          return Promise.resolve(blockHits);
        },
      },
    });

    const result = await client.callTool({ arguments: { query: 'run' }, name: 'search' });

    expect(result.content).toEqual([{ text: MCP_UNAUTHENTICATED_MESSAGE, type: 'text' }]);
    expect(searched).toBe(false);
  });

  test('reports an unexpected search failure without exposing it', async () => {
    const { client, reportedErrors } = await createErrorReportingClient({
      searchService: {
        ...createDependencies().searchService,
        searchBlocks: () => Promise.reject(new Error('database unavailable')),
      },
    });

    const result = await client.callTool({ arguments: { query: 'run' }, name: 'search' });

    expect(result.content).toEqual([{ text: MCP_UNEXPECTED_MESSAGE, type: 'text' }]);
    expect(reportedErrors).toHaveLength(1);
  });
});

describe('MCP fetch', () => {
  test('opens a page by its link as Markdown, each block with its id, with what hangs under it', async () => {
    const result = await fetchAddress(`${PORTAL}/es/spaces/${SPACE}/pages/${PAGE}`);

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      page: {
        backlinks: [],
        children: [
          {
            childCount: 2,
            id: MISSING,
            isCollection: true,
            title: 'Incidents',
            url: `${PORTAL}/spaces/${SPACE}/pages/${MISSING}`,
          },
        ],
        id: PAGE,
        path: [],
        title: 'Runbook',
        url: `${PORTAL}/spaces/${SPACE}/pages/${PAGE}`,
        version: 3,
      },
    });
    expect(textOf(result)).toContain(`<!-- block:${BLOCK} -->\nRun this first`);
  });

  test('never names a page the agent cannot see, even when the page it opened mentions it', async () => {
    const result = await fetchAddress(PAGE);
    const labelAsWords = MCP_REDACTED_REFERENCE_LABEL.replaceAll(/[[\]]/g, '\\$&');

    expect(textOf(result)).toContain(labelAsWords);
    expect(JSON.stringify(result)).not.toContain('Salaries');
    expect(JSON.stringify(result)).not.toContain(HIDDEN_PAGE);
  });

  test('opens the block a link points at, with its section and its page', async () => {
    const result = await fetchAddress(`/spaces/${SPACE}/pages/${PAGE}#${BLOCK}`);

    expect(result.structuredContent).toMatchObject({
      block: {
        id: BLOCK,
        section: ['Setup'],
        type: 'paragraph',
        url: `${PORTAL}/spaces/${SPACE}/pages/${PAGE}#${BLOCK}`,
      },
      page: { id: PAGE, title: 'Runbook' },
    });
    expect(textOf(result)).toContain(`Block ${BLOCK} (paragraph) in Runbook › Setup`);
  });

  test('opens a block by its id alone, finding the page it is on', async () => {
    const result = await fetchAddress(BLOCK);

    expect(result.structuredContent).toMatchObject({ block: { id: BLOCK }, page: { id: PAGE } });
  });

  test('says when the linked block is gone, and hands over the page it was on', async () => {
    const result = await fetchAddress(`${PAGE}#${MISSING}`);

    expect(result.structuredContent).toMatchObject({ note: MCP_BLOCK_NOT_FOUND_NOTE, page: { id: PAGE } });
    expect(textOf(result).startsWith(MCP_BLOCK_NOT_FOUND_NOTE)).toBe(true);
  });

  test('does not reveal whether an inaccessible page exists', async () => {
    const missing = await fetchAddress(MISSING);
    const inaccessible = await fetchAddress(`/spaces/${SPACE}/pages/33333333-3333-4333-8333-333333333333`);

    expect(missing.content).toEqual([{ text: MCP_INACCESSIBLE_MESSAGE, type: 'text' }]);
    expect(inaccessible.content).toEqual(missing.content);
  });

  test('refuses a page the token does not reach, though its owner could open it', async () => {
    const elsewhere = { permissions: [ACCESS_TOKEN_PERMISSIONS.pagesRead], spaceId: 'another-space' };
    const closed = { ...principal, access: { allSpaces: [], pages: [], spaces: [elsewhere] } };
    const result = await fetchAddress(PAGE, createDependencies(closed));

    expect(result.content).toEqual([{ text: MCP_INACCESSIBLE_MESSAGE, type: 'text' }]);
  });

  test('says what it takes when the address is not a Neuma link or id', async () => {
    const result = await fetchAddress('https://example.com/whatever');

    expect(result.content).toEqual([{ text: MCP_UNREADABLE_ADDRESS_MESSAGE, type: 'text' }]);
  });

  test('does not report expected inaccessible errors', async () => {
    const { client, reportedErrors } = await createErrorReportingClient();

    await client.callTool({ arguments: { address: MISSING }, name: 'fetch' });

    expect(reportedErrors).toHaveLength(0);
  });

  test('says a page cannot be read when its content is outside the foundation contract', async () => {
    const unreadable = { ...page, content: { content: [], schemaVersion: 2, type: 'doc' } };
    const result = await fetchAddress(PAGE, {
      ...createDependencies(),
      pagesService: { getAccessible: () => Promise.resolve(createPageReadResult(unreadable)) },
    });

    expect(result.content).toEqual([{ text: MCP_UNREADABLE_PAGE_MESSAGE, type: 'text' }]);
  });
});

describe('MCP fetch — whether a page can be trusted', () => {
  const ana = { id: 'u-1', name: 'Ana Pérez' };

  // Current or expired depends on today, so the day is pinned to keep the test deterministic.
  beforeAll(() => {
    setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
  });

  afterAll(() => {
    setSystemTime();
  });

  test('says who vouched for a page, when, and until when', async () => {
    const verified = {
      ...page,
      verificationExpiresAt: new Date('2026-12-31T23:59:59.999Z'),
      verifiedAt: new Date('2026-09-01T12:00:00.000Z'),
      verifiedBy: ana,
    };
    const result = await fetchAddress(PAGE, servingPage(verified));

    expect(result.structuredContent).toMatchObject({
      page: {
        state: {
          locked: false,
          owner: null,
          verification: { by: ana, on: '2026-09-01', status: 'VERIFIED', until: '2026-12-31' },
        },
      },
    });
    expect(textOf(result)).toContain('Verified by Ana Pérez (u-1) on 2026-09-01, valid until 2026-12-31.');
  });

  test('tells an expired verification apart from none, so the agent reads the page as possibly out of date', async () => {
    const expired = {
      ...page,
      verificationExpiresAt: new Date('2026-03-31T23:59:59.999Z'),
      verifiedAt: new Date('2026-01-10T12:00:00.000Z'),
      verifiedBy: ana,
    };
    const [expiredResult, plainResult] = await Promise.all([
      fetchAddress(PAGE, servingPage(expired)),
      fetchAddress(PAGE),
    ]);

    expect(textOf(expiredResult)).toContain(
      'Verification expired on 2026-03-31 (Ana Pérez (u-1) vouched for it on 2026-01-10): it may be out of date.',
    );
    expect(textOf(plainResult)).toContain('Not verified.');
  });

  test('says a page is locked and who owns it', async () => {
    const result = await fetchAddress(
      PAGE,
      servingPage({ ...page, lockedAt: new Date('2026-09-02T00:00:00.000Z'), owner: ana }),
    );

    expect(result.structuredContent).toMatchObject({ page: { state: { locked: true, owner: ana } } });
    expect(textOf(result)).toContain('Locked: nobody can change it until someone unlocks it.');
    expect(textOf(result)).toContain('Owner: Ana Pérez (u-1).');
  });
});

describe('MCP fetch — rows, comments and long pages', () => {
  test('gives a row its properties, named by the columns of its collection, empty ones included', async () => {
    const row = { ...page, parentId: MISSING, propertyValues: { status: 'En curso', tags: ['a', 'b'] } };
    const result = await fetchAddress(
      PAGE,
      servingPage(row, {
        collections: collectionWith([
          column('status', 'Estado', 'SELECT'),
          column('owner', 'Responsable', 'RICH_TEXT'),
          column('tags', 'Etiquetas', 'MULTI_SELECT'),
        ]),
      }),
    );

    expect(result.structuredContent).toMatchObject({
      page: {
        properties: [
          { key: 'status', label: 'Estado', type: 'SELECT', value: 'En curso' },
          { key: 'owner', label: 'Responsable', type: 'RICH_TEXT', value: null },
          { key: 'tags', label: 'Etiquetas', type: 'MULTI_SELECT', value: ['a', 'b'] },
        ],
      },
    });
    expect(textOf(result)).toContain('- Estado (status, SELECT): En curso');
    expect(textOf(result)).toContain('- Responsable (owner, RICH_TEXT): (empty)');
  });

  test('names the person a row is assigned to, not just their id', async () => {
    const row = { ...page, parentId: MISSING, propertyValues: { assignee: 'u-1' } };
    const result = await fetchAddress(
      PAGE,
      servingPage(row, {
        collections: collectionWith([column('assignee', 'Asignada a', 'PERSON')]),
      }),
    );

    expect(textOf(result)).toContain('- Asignada a (assignee, PERSON): Ana Pérez (u-1)');
  });

  test('keeps the properties of a row from a token that reads pages but not collections', async () => {
    const row = { ...page, parentId: MISSING, propertyValues: { status: 'En curso' } };
    const pagesOnly = {
      ...principal,
      access: { allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead], pages: [], spaces: [] },
    };
    const result = await fetchAddress(
      PAGE,
      servingPage(row, {
        collections: collectionWith([column('status', 'Estado', 'SELECT')]),
        principalResolver: { resolve: () => Promise.resolve(pagesOnly) },
      }),
    );

    expect(result.structuredContent).not.toHaveProperty('page.properties');
    expect(textOf(result)).not.toContain('En curso');
  });

  test('names only the first pages under a page and says how many more there are', async () => {
    const many = Array.from({ length: MCP_FETCH_CHILD_LIMIT + 5 }, (_unused, index) => ({
      childCount: 0,
      id: `child-${String(index)}`,
      isCollection: false,
      propertyValues: null,
      title: `Fila ${String(index)}`,
    }));
    const result = await fetchAddress(PAGE, {
      ...createDependencies(),
      outline: { ...outline, listChildren: childrenOf(many) },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({ page: { moreChildren: 5 } });
    expect(textOf(result)).toContain(`…and 5 more: list_pages with parentPageId ${PAGE}`);
  });

  test('says first that a page is in the trash', async () => {
    const result = await fetchAddress(PAGE, servingPage({ ...page, lifecycle: 'TRASHED' }));

    expect(textOf(result).startsWith(MCP_FETCHED_IN_TRASH_NOTE)).toBe(true);
  });

  test('says nothing of properties for a page that is not a row', async () => {
    const result = await fetchAddress(PAGE);

    expect(result.structuredContent).not.toHaveProperty('page.properties');
  });

  test('hands over what was said on each block', async () => {
    const comment = { author: 'Ana', body: 'Revisar', createdAt: '2026-09-01T10:00:00.000Z', id: 'c1' };
    const commented: PageSummary = {
      ...page,
      content: {
        content: [
          { attrs: { comments: [comment], id: BLOCK }, content: [{ text: 'Uno', type: 'text' }], type: 'paragraph' },
        ],
        schemaVersion: 1,
        type: 'doc',
      },
    };

    const result = await fetchAddress(PAGE, servingPage(commented));

    expect(result.structuredContent).toMatchObject({
      page: { comments: [{ author: 'Ana', blockId: BLOCK, body: 'Revisar', createdAt: comment.createdAt, id: 'c1' }] },
    });
    expect(textOf(result)).toContain(`- Comment c1 by Ana on block ${BLOCK}`);
  });

  test('hands a long page over in parts, and the cursor leads to the next one', async () => {
    const paragraph = (at: number) => ({
      attrs: { id: `44444444-4444-4444-8444-${String(at).padStart(12, '0')}` },
      content: [{ text: 'x'.repeat(10_000), type: 'text' }],
      type: 'paragraph',
    });
    const long: PageSummary = {
      ...page,
      content: { content: Array.from({ length: 12 }, (_unused, at) => paragraph(at)), schemaVersion: 1, type: 'doc' },
    };
    const client = await connectClient(servingPage(long));

    const first = await client.callTool({ arguments: { address: PAGE }, name: 'fetch' });
    const cursor = z.object({ page: z.object({ nextCursor: z.string() }) }).parse(first.structuredContent)
      .page.nextCursor;
    const second = await client.callTool({ arguments: { address: PAGE, cursor }, name: 'fetch' });

    expect(textOf(first)).toContain(`fetch it again with cursor ${cursor}`);
    expect(textOf(second)).toContain(`<!-- block:${paragraph(Number(cursor)).attrs.id} -->`);
    expect(textOf(second)).not.toContain(`<!-- block:${paragraph(0).attrs.id} -->`);
  });
});

describe('MCP search — by block type', () => {
  test('passes the block type asked for to the block search', async () => {
    const received: PageBlockSearchQuery[] = [];
    const client = await connectClient({
      ...createDependencies(),
      searchService: {
        ...createDependencies().searchService,
        searchBlocks: (query) => {
          received.push(query);
          return Promise.resolve(blockHits);
        },
      },
    });

    await client.callTool({ arguments: { blockType: 'task_item', query: 'run' }, name: 'search' });

    expect(received[0]?.blockType).toBe('task_item');
  });
});

describe('MCP search — verified pages, author and when it was edited', () => {
  test('passes the same filters to the search of blocks and of titles', async () => {
    const blockQueries: PageBlockSearchQuery[] = [];
    const pageQueries: SearchQuery[] = [];
    const client = await connectClient({
      ...createDependencies(),
      searchService: {
        ...createDependencies().searchService,
        search: (query) => {
          pageQueries.push(query);
          return Promise.resolve(pageHits);
        },
        searchBlocks: (query) => {
          blockQueries.push(query);
          return Promise.resolve(blockHits);
        },
      },
    });

    await client.callTool({
      arguments: { author: 'Ana', editedWithin: 'LAST_SEVEN_DAYS', query: 'run', verifiedOnly: true },
      name: 'search',
    });

    const filters = { authorQuery: 'Ana', editedRange: 'LAST_SEVEN_DAYS', verifiedOnly: true };
    expect(blockQueries[0]).toMatchObject(filters);
    expect(pageQueries[0]).toMatchObject(filters);
  });

  test('marks what comes from a verified page', async () => {
    const result = await (await connectClient(createDependencies())).callTool({
      arguments: { query: 'run' },
      name: 'search',
    });

    expect(result.structuredContent).toMatchObject({
      blocks: [{ blockId: BLOCK, isPageVerified: true }],
      pages: [{ isVerified: false, pageId: MISSING }],
    });
    expect(textOf(result)).toContain(`(paragraph, block ${BLOCK}, verified page)`);
  });
});

describe('MCP list_pages', () => {
  test('lists the pages under a page the agent can see, with links', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.callTool({ arguments: { parentPageId: PAGE }, name: 'list_pages' });

    expect(result.structuredContent).toEqual({
      pages: [
        {
          childCount: 2,
          id: MISSING,
          isCollection: true,
          title: 'Incidents',
          url: `${PORTAL}/spaces/${SPACE}/pages/${MISSING}`,
        },
      ],
      total: 1,
    });
  });

  test('gives each row of a collection its properties, people by name', async () => {
    const task = (at: number, status: string) => ({
      childCount: 0,
      id: `task-${String(at)}`,
      isCollection: false,
      propertyValues: { assignee: 'u-1', status },
      title: `Tarea ${String(at)}`,
    });
    const client = await connectClient({
      ...createDependencies(),
      outline: { ...outline, listChildren: childrenOf([task(1, 'todo'), task(2, 'done')]) },
      collections: collectionWith([
        column('title', 'Título', 'TITLE'),
        column('status', 'Estado', 'SELECT'),
        column('assignee', 'Asignada a', 'PERSON'),
      ]),
    });

    const result = await client.callTool({ arguments: { parentPageId: PAGE }, name: 'list_pages' });

    expect(textOf(result)).toContain('Tarea 1');
    expect(textOf(result)).toContain('Estado: todo · Asignada a: Ana Pérez (u-1)');
    expect(textOf(result)).toContain('Estado: done');
  });

  test('lists a long level in parts, and the cursor leads to the rest', async () => {
    const many = Array.from({ length: 7 }, (_unused, at) => ({
      childCount: 0,
      id: `p-${String(at)}`,
      isCollection: false,
      propertyValues: null,
      title: `Página ${String(at)}`,
    }));
    const client = await connectClient({
      ...createDependencies(),
      outline: { ...outline, listChildren: childrenOf(many) },
    });

    const first = await client.callTool({ arguments: { limit: 3, spaceId: SPACE }, name: 'list_pages' });
    const firstPart = z
      .object({ nextCursor: z.string(), pages: z.array(z.object({ id: z.string() })), total: z.number() })
      .parse(first.structuredContent);
    const rest = await client.callTool({
      arguments: { cursor: firstPart.nextCursor, limit: 10, spaceId: SPACE },
      name: 'list_pages',
    });

    expect(firstPart.pages.map((page) => page.id)).toEqual(['p-0', 'p-1', 'p-2']);
    expect(firstPart.total).toBe(7);
    expect(textOf(first)).toContain(`list the rest with cursor ${firstPart.nextCursor}`);
    expect(rest.structuredContent).not.toHaveProperty('nextCursor');
    expect(textOf(rest)).toContain('Página 6');
  });

  test('answers a page it cannot see as if it did not exist', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.callTool({ arguments: { parentPageId: HIDDEN_PAGE }, name: 'list_pages' });

    expect(result.content).toEqual([{ text: MCP_INACCESSIBLE_MESSAGE, type: 'text' }]);
  });

  test('asks where to list from when told nowhere', async () => {
    const client = await connectClient(createDependencies());

    const result = await client.callTool({ arguments: {}, name: 'list_pages' });

    expect(result.content).toEqual([{ text: MCP_LIST_PAGES_PLACE_MESSAGE, type: 'text' }]);
  });
});
