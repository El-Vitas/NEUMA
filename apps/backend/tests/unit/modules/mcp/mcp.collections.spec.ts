import { describe, expect, test } from 'bun:test';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import {
  ACCESS_TOKEN_PERMISSIONS,
  type AccessTokenPermission,
  DEFAULT_PAGE_PROPERTY_CONFIG,
  PAGE_OPTION_COLOR,
  type PagePropertyValues,
  type PageQueryRequest,
  Result,
  USER_ROLE,
} from '@neuma/shared';
import { MAX_FILE_SIZE } from '../../../../src/common/domain/file.constants';
import type { AccessTokenPlaceReader } from '../../../../src/common/types/access-token.types';
import {
  MCP_INACCESSIBLE_MESSAGE,
  MCP_NOT_A_COLLECTION_MESSAGE,
  MCP_NOT_A_ROW_MESSAGE,
  MCP_PAGE_LOCKED_MESSAGE,
} from '../../../../src/modules/mcp/constants/mcp.constants';
import { createMcpServer } from '../../../../src/modules/mcp/mcp.server';
import type {
  McpChangesAnswer,
  McpCollectionService,
  McpCollectionShape,
  McpQueryAnswer,
  McpRefusal,
  McpRowWriter,
  McpWrittenRow,
} from '../../../../src/modules/mcp/types/mcp.collections.types';
import type {
  McpActionEntry,
  McpFileUploader,
  McpPageSource,
  McpPrincipal,
  McpServerDependencies,
  McpUploadedFile,
} from '../../../../src/modules/mcp/types/mcp.types';
import { createUnusedPageManager } from '../../../helpers/mcp.page-manager.helper';

const SPACE = '00000000-0000-4000-8000-00000000000a';
const OTHER_SPACE = '00000000-0000-4000-8000-00000000000b';
const COLLECTION = '11111111-1111-4111-8111-111111111111';
const ROW = '22222222-2222-4222-8222-222222222222';
const CLOSED_ROW = '33333333-3333-4333-8333-333333333333';
const PLAIN_PAGE = '44444444-4444-4444-8444-444444444444';
const NEW_ROW = '55555555-5555-4555-8555-555555555555';
const LINKED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LINKED_ROW = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECTS = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PROJECT_ALFA = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PROJECT_BETA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const PROJECT_BETA_TWIN = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const PROJECT_CLOSED = '12121212-1212-4121-8121-121212121212';

const everyCollectionPermission: readonly AccessTokenPermission[] = [
  ACCESS_TOKEN_PERMISSIONS.collectionsRead,
  ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
  ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
];

const principalWith = (allSpaces: readonly AccessTokenPermission[]): McpPrincipal => ({
  access: {
    allSpaces,
    pages: [
      { pageId: CLOSED_ROW, permissions: [] },
      { pageId: PROJECT_CLOSED, permissions: [] },
    ],
    spaces: [],
  },
  role: USER_ROLE.WORKER,
  tokenId: 'token-1',
  userId: 'user-1',
  workspaceId: 'workspace-1',
});

const pageSource = (id: string, title: string, parentId: string | null, values: PagePropertyValues | null) => ({
  content: { content: [], schemaVersion: 1, type: 'doc' },
  id,
  lifecycle: 'ACTIVE' as const,
  lockedAt: null,
  order: 0,
  owner: null,
  parentId,
  propertyValues: values,
  spaceId: SPACE,
  title,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedBy: null,
  version: 1,
});

const pages: ReadonlyMap<string, McpPageSource> = new Map([
  [COLLECTION, pageSource(COLLECTION, 'Tareas', null, null)],
  [ROW, pageSource(ROW, 'Escribir el informe', COLLECTION, { owner: ['u-1'], status: 'todo0001' })],
  [CLOSED_ROW, pageSource(CLOSED_ROW, 'Sueldos', COLLECTION, { status: 'done0001' })],
  [PLAIN_PAGE, pageSource(PLAIN_PAGE, 'Notas', null, null)],
  [LINKED, pageSource(LINKED, 'Entregas', null, null)],
  [LINKED_ROW, pageSource(LINKED_ROW, 'Primera entrega', LINKED, { projects: [PROJECT_ALFA, PROJECT_CLOSED] })],
  [PROJECTS, pageSource(PROJECTS, 'Proyectos', null, null)],
  [PROJECT_ALFA, pageSource(PROJECT_ALFA, 'Alfa', PROJECTS, null)],
  [PROJECT_BETA, pageSource(PROJECT_BETA, 'Beta', PROJECTS, null)],
  [PROJECT_BETA_TWIN, pageSource(PROJECT_BETA_TWIN, 'Beta', PROJECTS, null)],
  [PROJECT_CLOSED, pageSource(PROJECT_CLOSED, 'Secreto', PROJECTS, null)],
]);

const UPLOADED_FILE = '99999999-9999-4999-8999-999999999999';

const projectRows = [PROJECT_ALFA, PROJECT_BETA, PROJECT_BETA_TWIN, PROJECT_CLOSED];

const placeOf = (pageId: string) => {
  const parentId = pages.get(pageId)?.parentId ?? null;
  return { lineage: parentId === null ? [pageId] : [pageId, parentId], spaceId: SPACE };
};

const placeReader: AccessTokenPlaceReader = {
  readPlace: (pageId) => Promise.resolve(placeOf(pageId)),
  readPlaces: (pageIds) => Promise.resolve(new Map(pageIds.map((pageId) => [pageId, placeOf(pageId)]))),
  resolvePageReach: () => Promise.resolve({ allowedPageIds: [], closedPageIds: [], spaceIdsWithAllowedPages: [] }),
};

const initialShape: McpCollectionShape = {
  properties: [
    {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: 'title',
      label: 'Título',
      options: null,
      required: true,
      type: 'TITLE',
    },
    {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: 'status',
      label: 'Estado',
      options: [
        { color: PAGE_OPTION_COLOR.GRAY, group: null, id: 'todo0001', value: 'Por hacer' },
        { color: PAGE_OPTION_COLOR.GREEN, group: null, id: 'done0001', value: 'Hecho' },
      ],
      required: false,
      type: 'SELECT',
    },
    {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: 'owner',
      label: 'Responsable',
      options: null,
      required: false,
      type: 'PERSON',
    },
  ],
  views: [{ configuration: {}, id: 'view-tabla', isDefault: true, name: 'Tabla', type: 'TABLE' }],
};

const titleColumn = {
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key: 'title',
  label: 'Título',
  options: null,
  required: true,
  type: 'TITLE',
} as const;

/** A collection with a relation to Proyectos, files, a status and a unique id: one column of each new kind. */
const linkedShape: McpCollectionShape = {
  properties: [
    {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: 'title',
      label: 'Título',
      options: null,
      required: true,
      type: 'TITLE',
    },
    {
      config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, mirrorPropertyKey: 'deliveries', targetCollectionId: PROJECTS },
      key: 'projects',
      label: 'Proyectos',
      options: null,
      required: false,
      type: 'RELATION',
    },
    {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: 'docs',
      label: 'Archivos',
      options: null,
      required: false,
      type: 'FILES',
    },
    {
      config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, prefix: 'ENT' },
      key: 'code',
      label: 'Código',
      options: null,
      required: false,
      type: 'UNIQUE_ID',
    },
    {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: 'stage',
      label: 'Etapa',
      options: [
        { color: PAGE_OPTION_COLOR.GRAY, group: 'TO_DO', id: 'stage001', value: 'Pendiente' },
        { color: PAGE_OPTION_COLOR.BLUE, group: 'IN_PROGRESS', id: 'stage002', value: 'En curso' },
        { color: PAGE_OPTION_COLOR.GREEN, group: 'COMPLETE', id: 'stage003', value: 'Entregada' },
      ],
      required: false,
      type: 'STATUS',
    },
    {
      config: { ...DEFAULT_PAGE_PROPERTY_CONFIG, allowsMultiple: true },
      key: 'reviewers',
      label: 'Revisores',
      options: null,
      required: false,
      type: 'PERSON',
    },
    {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: 'window',
      label: 'Ventana',
      options: null,
      required: false,
      type: 'DATE',
    },
  ],
  views: [{ configuration: {}, id: 'view-tabla', isDefault: true, name: 'Tabla', type: 'TABLE' }],
};

const foldedLower = (text: string): string => text.toLowerCase();

/** What the server answers about the rows of Proyectos for an exact title or for words the title holds. */
const answerAboutProjects = (input: {
  readonly excludedRowIds: readonly string[];
  readonly request: PageQueryRequest;
}): McpQueryAnswer => {
  const { quickFilter, search } = input.request;
  const wanted = quickFilter?.kind === 'CONDITION' ? quickFilter.value : null;
  const matching = projectRows
    .filter((id) => !input.excludedRowIds.includes(id))
    .filter((id) => {
      const title = pages.get(id)?.title ?? '';
      if (typeof wanted === 'string') return title === wanted;
      return search === undefined || foldedLower(title).includes(foldedLower(search));
    });
  return {
    attachedFiles: [],
    changesCursor: 'cursor-of-query',
    reducers: { rows: { ids: matching, kind: 'results', nextCursor: null } },
    rows: Object.fromEntries(
      matching.map((id) => [id, written(id, pages.get(id)?.title ?? '', pages.get(id)?.propertyValues ?? null)]),
    ),
  };
};

const createCollectionStore = (refusesTheShape = false) => {
  let shape = initialShape;
  const changesQueue: McpChangesAnswer[] = [];
  const received: Record<string, unknown[]> = {
    defineSchema: [],
    moveRow: [],
    queryCollection: [],
    readChanges: [],
    rewriteOption: [],
    viewOperations: [],
  };
  const service: McpCollectionService = {
    applyViewOperations: (input) => {
      received.viewOperations?.push(input);
      return Promise.resolve(Result.ok({ configuration: {}, id: input.viewId, version: 1 }));
    },
    moveRow: (input) => {
      received.moveRow?.push(input);
      return Promise.resolve(Result.ok({ configuration: {}, id: input.viewId, version: 1 }));
    },
    defineSchema: (input) => {
      received.defineSchema?.push(input);
      if (refusesTheShape)
        return Promise.resolve(Result.fail({ code: 'SCHEMA_PROPERTY_DEFINITION_INVALID', details: undefined }));
      shape = {
        properties: input.properties.map((column) => ({
          ...column,
          options:
            column.options?.map((option, index) => ({ ...option, id: option.id ?? `new${String(index)}` })) ?? null,
        })),
        views: input.views,
      };
      return Promise.resolve(Result.ok(shape));
    },
    getSchema: (pageId) => {
      if (pageId === LINKED) return Promise.resolve(Result.ok(linkedShape));
      if (pageId === PROJECTS) return Promise.resolve(Result.ok({ ...initialShape, properties: [titleColumn] }));
      return Promise.resolve(Result.ok(pageId === COLLECTION ? shape : { properties: [], views: [] }));
    },
    queryCollection: (input) => {
      received.queryCollection?.push(input);
      if (input.pageId === PROJECTS) return Promise.resolve(Result.ok(answerAboutProjects(input)));
      const row = pages.get(ROW);
      const wantsRows = input.request.reducers.some((reducer) => reducer.id === 'rows');
      const answered = row === undefined || !wantsRows ? [] : [written(ROW, row.title, row.propertyValues)];
      return Promise.resolve(
        Result.ok({
          attachedFiles: [],
          changesCursor: 'cursor-of-query',
          reducers: {
            counts: {
              distinctRowCount: 1,
              groups: [{ key: 'todo0001', subKey: null, values: { total: 1 } }],
              kind: 'aggregations' as const,
              totals: { a0: 3, total: 1 },
            },
            rows: { ids: answered.map((entry) => entry.id), kind: 'results' as const, nextCursor: null },
          },
          rows: Object.fromEntries(answered.map((entry) => [entry.id, entry])),
        }),
      );
    },
    readChanges: (input) => {
      received.readChanges?.push(input);
      const isEmpty = changesQueue.length === 0;
      const next = changesQueue.shift();
      return Promise.resolve(
        Result.ok(
          next ?? {
            attachedFiles: [],
            cursor: isEmpty ? 'cursor-now' : 'cursor-next',
            hasMore: false,
            isReset: false,
            rows: [],
            total: 1,
            trashedIds: [],
          },
        ),
      );
    },
    rewriteOption: (input) => {
      received.rewriteOption?.push(input);
      return Promise.resolve(Result.ok(shape));
    },
  };
  return { changesQueue, received, service };
};

const written = (id: string, title: string, values: PagePropertyValues | null): McpWrittenRow => ({
  id,
  propertyValues: values,
  spaceId: SPACE,
  title,
});

const createRowStore = (
  refusal: McpRefusal | null = null,
  relationRefusal: McpRefusal | null = null,
  uploadRefusal: McpRefusal | null = null,
) => {
  const received: Record<string, unknown[]> = {
    changeRelations: [],
    create: [],
    rename: [],
    trash: [],
    updateProperties: [],
    upload: [],
  };
  const files: McpFileUploader = {
    upload: (input) => {
      received.upload?.push({ ...input, buffer: input.buffer.toString('utf8') });
      return Promise.resolve(
        uploadRefusal === null
          ? Result.ok<McpUploadedFile, McpRefusal>({
              id: UPLOADED_FILE,
              mimeType: input.mimeType,
              originalFilename: input.originalFilename,
              size: input.size,
            })
          : Result.fail<McpUploadedFile, McpRefusal>(uploadRefusal),
      );
    },
  };
  const answer = (row: McpWrittenRow) =>
    Promise.resolve(
      refusal === null ? Result.ok<McpWrittenRow, McpRefusal>(row) : Result.fail<McpWrittenRow, McpRefusal>(refusal),
    );
  const writer: McpRowWriter = {
    changeRelations: (input) => {
      received.changeRelations?.push(input);
      return Promise.resolve(
        relationRefusal === null
          ? Result.ok<boolean, McpRefusal>(true)
          : Result.fail<boolean, McpRefusal>(relationRefusal),
      );
    },
    create: (input) => {
      received.create?.push(input);
      return answer(written(NEW_ROW, input.title, input.propertyValues));
    },
    rename: (pageId, title) => {
      received.rename?.push({ pageId, title });
      return answer(written(pageId, title, { status: 'done0001' }));
    },
    updateProperties: (input) => {
      received.updateProperties?.push(input);
      return answer(written(input.pageId, 'Escribir el informe', { status: 'done0001' }));
    },
  };
  return { files, received, writer };
};

const notUsedHere = (): Promise<never> => Promise.reject(new Error('Not used in this test'));

interface LoggedAction extends McpActionEntry {
  readonly outcome: string;
}

interface Harness {
  readonly actions: LoggedAction[];
  readonly client: Client;
  readonly collections: ReturnType<typeof createCollectionStore>;
  readonly rows: ReturnType<typeof createRowStore>;
}

const connect = async (
  permissions: readonly AccessTokenPermission[] = everyCollectionPermission,
  rows = createRowStore(),
  principal = principalWith(permissions),
  collections = createCollectionStore(),
): Promise<Harness> => {
  const actions: LoggedAction[] = [];
  const dependencies: McpServerDependencies = {
    actionLog: {
      finish: (actionId, outcome) => {
        const index = Number(actionId);
        const action = actions[index];
        if (action !== undefined) actions[index] = { ...action, outcome };
        return Promise.resolve();
      },
      findLiveRequest: () => Promise.resolve(null),
      start: (entry) => {
        actions.push({ ...entry, outcome: 'PENDING' });
        return Promise.resolve(String(actions.length - 1));
      },
    },
    backlinks: { listBacklinks: notUsedHere },
    collections: collections.service,
    content: { edit: notUsedHere },
    discussions: {
      getDiscussion: notUsedHere,
      listPageDiscussions: notUsedHere,
      openDiscussion: notUsedHere,
      removeComment: notUsedHere,
      reply: notUsedHere,
    },
    drawings: { checkDiagram: notUsedHere, checkFormula: () => Result.ok('') },
    files: rows.files,
    pages: {
      ...createUnusedPageManager(),
      trash: (input) => {
        rows.received.trash?.push(input);
        return Promise.resolve(Result.ok(true));
      },
    },
    observer: { callFinished: () => undefined, unexpected: () => undefined },
    outline: { listAncestors: notUsedHere, listChildren: notUsedHere, listReadable: notUsedHere },
    pagesService: {
      getAccessible: (pageId) => {
        const found = pages.get(pageId);
        return Promise.resolve(found === undefined ? Result.fail(new Error('No page')) : Result.ok(found));
      },
    },
    people: {
      listAssignableMembers: () =>
        Promise.resolve([
          { email: 'ana@example.com', id: 'u-1', name: 'Ana Pérez' },
          { email: 'luis@example.com', id: 'u-2', name: 'Luis Soto' },
        ]),
    },
    placeReader,
    portalUrl: 'https://brain.example.com',
    principalResolver: { resolve: () => Promise.resolve(principal) },
    rows: rows.writer,
    searchService: { locateBlock: notUsedHere, search: notUsedHere, searchBlocks: notUsedHere },
    spacesService: { listAccessible: notUsedHere },
    workspacesService: { resolveForUser: () => Promise.resolve({ id: 'workspace-1', name: 'Neuma' }) },
  };
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'mcp-collections-test', version: '1.0.0' });
  await createMcpServer(dependencies, principal).connect(serverSide);
  await client.connect(clientSide);
  return { actions, client, collections, rows };
};

type ToolResult = Awaited<ReturnType<Client['callTool']>>;

const summarizeActions = (actions: readonly LoggedAction[]) =>
  actions.map(({ outcome, pageId, tool }) => ({ outcome, pageId, tool }));

const textOf = (result: ToolResult): string => (result.content[0] as { text: string }).text;

describe('MCP collections — reading', () => {
  test('describes a collection by the names people see: columns with their options, views with their grouping', async () => {
    const { client } = await connect();

    const result = await client.callTool({ arguments: { collection: COLLECTION }, name: 'get_collection' });

    expect(textOf(result)).toContain('- Estado (status, SELECT): Por hacer, Hecho');
    expect(textOf(result)).toContain('- Tabla (TABLE, default)');
  });

  test('says a page without columns is not a collection', async () => {
    const { client } = await connect();

    const result = await client.callTool({ arguments: { collection: PLAIN_PAGE }, name: 'get_collection' });

    expect(textOf(result)).toBe(MCP_NOT_A_COLLECTION_MESSAGE);
  });

  test('answers a token that reads collections only in another space as if the collection were not there', async () => {
    const readsElsewhere: McpPrincipal = {
      ...principalWith([ACCESS_TOKEN_PERMISSIONS.pagesRead]),
      access: {
        allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead],
        pages: [],
        spaces: [{ permissions: [ACCESS_TOKEN_PERMISSIONS.collectionsRead], spaceId: OTHER_SPACE }],
      },
    };
    const { client } = await connect([], createRowStore(), readsElsewhere);

    const result = await client.callTool({ arguments: { collection: COLLECTION }, name: 'get_collection' });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(MCP_INACCESSIBLE_MESSAGE);
  });

  test('turns conditions named by people into the filter a view stores, and leaves out rows the token has closed', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({
      arguments: {
        collection: COLLECTION,
        where: [{ column: 'responsable', operator: 'IS', value: 'Ana Pérez' }],
      },
      name: 'query_collection',
    });

    const asked = collections.received.queryCollection?.[0];
    expect((asked as { excludedRowIds: string[] }).excludedRowIds).toContain(CLOSED_ROW);
    expect(asked).toMatchObject({
      request: {
        quickFilter: { conditions: [{ operator: 'IS', propertyKey: 'owner', value: 'u-1' }] },
        reducers: [
          { id: 'rows', kind: 'results', limit: 25 },
          { by: 'NONE', id: 'counts', kind: 'aggregations' },
        ],
      },
    });
    expect(result.structuredContent).toMatchObject({ rows: [{ id: ROW }], total: 1 });
    expect(textOf(result)).toContain('Responsable: Ana Pérez (u-1)');
    expect(textOf(result)).not.toContain('Sueldos');
  });

  test('asks only for the count when the limit is 0, and brings no rows', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({ arguments: { collection: COLLECTION, limit: 0 }, name: 'query_collection' });

    expect(collections.received.queryCollection?.[0]).toMatchObject({
      request: { reducers: [{ id: 'counts', kind: 'aggregations' }] },
    });
    expect(result.structuredContent).toMatchObject({ rows: [], total: 1 });
  });

  test('asks for one group by the name of its option, with the rows of that group only', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({
      arguments: { collection: COLLECTION, group: 'por hacer', groupBy: 'Estado', limit: 10 },
      name: 'query_collection',
    });

    expect(collections.received.queryCollection?.[0]).toMatchObject({
      request: {
        reducers: [
          { group: { key: 'todo0001' }, groupBy: 'status', id: 'rows', kind: 'groupResults', limit: 10 },
          { by: 'GROUP', groupBy: 'status', id: 'counts', kind: 'aggregations' },
        ],
      },
    });
    expect(result.structuredContent).toMatchObject({
      groups: [{ count: 1, name: 'Por hacer', rows: [{ id: ROW }] }],
    });
  });

  test('brings only the columns it was asked for and names each total as people read it', async () => {
    const { client } = await connect();

    const result = await client.callTool({
      arguments: {
        aggregate: [{ calculation: 'SUM', column: 'Estado' }],
        collection: COLLECTION,
        columns: ['Responsable'],
      },
      name: 'query_collection',
    });

    const [row] = (result.structuredContent as { rows: { properties: { key: string }[] }[] }).rows;
    expect(row?.properties.map((property) => property.key)).toEqual(['owner']);
    expect(result.structuredContent).toMatchObject({ aggregates: { 'SUM Estado': 3 } });
  });

  test('refuses a group without a column to group by, before asking the server anything', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({
      arguments: { collection: COLLECTION, group: 'Hecho' },
      name: 'query_collection',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('groupBy');
    expect(collections.received.queryCollection).toEqual([]);
  });
});

describe('MCP collections — changes', () => {
  test('hands out a cursor to start watching from now, without rows', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({ arguments: { collection: COLLECTION }, name: 'collection_changes' });

    expect(collections.received.readChanges?.[0]).toMatchObject({ cursor: undefined, pageId: COLLECTION });
    expect(result.structuredContent).toMatchObject({ cursor: 'cursor-now', hasMore: false, reset: false, rows: [] });
  });

  test('brings the rows that changed as the agent reads them, the ones that went to the trash and the count', async () => {
    const { client, collections } = await connect();
    const row = pages.get(ROW);
    collections.changesQueue.push({
      attachedFiles: [],
      cursor: 'cursor-2',
      hasMore: false,
      isReset: false,
      rows: [written(ROW, row?.title ?? '', row?.propertyValues ?? null)],
      total: 4,
      trashedIds: [NEW_ROW],
    });

    const result = await client.callTool({
      arguments: { collection: COLLECTION, columns: ['Responsable'], since: 'cursor-1' },
      name: 'collection_changes',
    });

    const asked = collections.received.readChanges?.[0];
    expect(asked).toMatchObject({ cursor: 'cursor-1', pageId: COLLECTION });
    expect((asked as { excludedRowIds: string[] }).excludedRowIds).toContain(CLOSED_ROW);
    expect(result.structuredContent).toMatchObject({
      cursor: 'cursor-2',
      rows: [{ id: ROW }],
      total: 4,
      trashed: [NEW_ROW],
    });
    const [described] = (result.structuredContent as { rows: { properties: { key: string }[] }[] }).rows;
    expect(described?.properties.map((property) => property.key)).toEqual(['owner']);
  });

  test('tells the agent to read the collection again when the cursor is not valid', async () => {
    const { client, collections } = await connect();
    collections.changesQueue.push({
      attachedFiles: [],
      cursor: 'cursor-fresh',
      hasMore: false,
      isReset: true,
      rows: [],
      total: 1,
      trashedIds: [],
    });

    const result = await client.callTool({
      arguments: { collection: COLLECTION, since: 'garbage' },
      name: 'collection_changes',
    });

    expect(result.structuredContent).toMatchObject({ cursor: 'cursor-fresh', reset: true });
    expect(textOf(result)).toContain('query_collection');
  });

  test('waits for a change instead of answering empty, up to the seconds asked for', async () => {
    const { client, collections } = await connect();
    const row = pages.get(ROW);
    collections.changesQueue.push({
      attachedFiles: [],
      cursor: 'cursor-quiet',
      hasMore: false,
      isReset: false,
      rows: [],
      total: 1,
      trashedIds: [],
    });
    collections.changesQueue.push({
      attachedFiles: [],
      cursor: 'cursor-busy',
      hasMore: false,
      isReset: false,
      rows: [written(ROW, row?.title ?? '', row?.propertyValues ?? null)],
      total: 1,
      trashedIds: [],
    });

    const result = await client.callTool({
      arguments: { collection: COLLECTION, since: 'cursor-1', waitSeconds: 5 },
      name: 'collection_changes',
    });

    expect(collections.received.readChanges).toHaveLength(2);
    expect(collections.received.readChanges?.[1]).toMatchObject({ cursor: 'cursor-quiet' });
    expect(result.structuredContent).toMatchObject({ cursor: 'cursor-busy', rows: [{ id: ROW }] });
  });

  test('gives back the cursor to start watching with every query', async () => {
    const { client } = await connect();

    const result = await client.callTool({ arguments: { collection: COLLECTION }, name: 'query_collection' });

    expect(result.structuredContent).toMatchObject({ changesCursor: 'cursor-of-query' });
  });
});

describe('MCP collections — rows', () => {
  test('creates a row with options and people named as people see them, and records it', async () => {
    const { actions, client, rows } = await connect();

    const result = await client.callTool({
      arguments: {
        collection: COLLECTION,
        properties: { Estado: 'hecho', Responsable: 'ana pérez' },
        text: 'Primer párrafo',
        title: 'Revisar contrato',
      },
      name: 'create_row',
    });

    expect(result.isError).toBeUndefined();
    expect(rows.received.create?.[0]).toMatchObject({
      parentId: COLLECTION,
      propertyValues: { owner: ['u-1'], status: 'done0001' },
      title: 'Revisar contrato',
    });
    expect(summarizeActions(actions)).toEqual([{ outcome: 'DONE', pageId: COLLECTION, tool: 'create_row' }]);
  });

  test('refuses an option the column does not have before writing, says which ones it has, and records the refusal', async () => {
    const { actions, client, rows } = await connect();

    const result = await client.callTool({
      arguments: { collection: COLLECTION, properties: { Estado: 'Bloqueado' }, title: 'Algo' },
      name: 'create_row',
    });

    expect(textOf(result)).toContain('Por hacer, Hecho');
    expect(rows.received.create).toEqual([]);
    expect(summarizeActions(actions)).toEqual([{ outcome: 'REFUSED', pageId: COLLECTION, tool: 'create_row' }]);
  });

  test('never offers a read-only token the tools that write', async () => {
    const { client } = await connect([ACCESS_TOKEN_PERMISSIONS.collectionsRead]);

    const offered = (await client.listTools()).tools.map((tool) => tool.name);

    expect(offered).not.toContain('create_row');
    expect(offered).not.toContain('update_collection_columns');
  });

  test('moves a task and renames it in one write, so both land or neither does', async () => {
    const { client, rows } = await connect();

    await client.callTool({
      arguments: { properties: { Estado: 'Hecho' }, row: ROW, title: 'Informe entregado' },
      name: 'update_row',
    });

    expect(rows.received.updateProperties).toEqual([
      expect.objectContaining({ pageId: ROW, propertyValues: { status: 'done0001' }, title: 'Informe entregado' }),
    ]);
    expect(rows.received.rename).toEqual([]);
  });

  test('renames a row alone by the path that only renames', async () => {
    const { client, rows } = await connect();

    await client.callTool({ arguments: { row: ROW, title: 'Informe entregado' }, name: 'update_row' });

    expect(rows.received.rename).toEqual([{ pageId: ROW, title: 'Informe entregado' }]);
    expect(rows.received.updateProperties).toEqual([]);
  });

  test('refuses to change a row the token has closed, even when it can write in the collection', async () => {
    const { actions, client, rows } = await connect();

    const result = await client.callTool({
      arguments: { properties: { Estado: 'Hecho' }, row: CLOSED_ROW },
      name: 'update_row',
    });

    expect(textOf(result)).toBe(MCP_INACCESSIBLE_MESSAGE);
    expect(rows.received.updateProperties).toEqual([]);
    expect(summarizeActions(actions)).toEqual([{ outcome: 'REFUSED', pageId: null, tool: 'update_row' }]);
  });

  test('says a page outside any collection is not a row', async () => {
    const { client } = await connect();

    const result = await client.callTool({ arguments: { row: PLAIN_PAGE, title: 'Otra' }, name: 'update_row' });

    expect(textOf(result)).toBe(MCP_NOT_A_ROW_MESSAGE);
  });

  test('tells the agent a locked row needs a person, and records the refusal', async () => {
    const { actions, client } = await connect(
      everyCollectionPermission,
      createRowStore({ code: 'PAGE_LOCKED', details: undefined }),
    );

    const result = await client.callTool({ arguments: { row: ROW, title: 'Otra' }, name: 'update_row' });

    expect(textOf(result)).toBe(MCP_PAGE_LOCKED_MESSAGE);
    expect(summarizeActions(actions)).toEqual([{ outcome: 'REFUSED', pageId: ROW, tool: 'update_row' }]);
  });
});

describe('MCP collections — rows with the property types', () => {
  test('gives a status by the name of its option or by its id, and a person by name, email or id', async () => {
    const { client, rows } = await connect();

    const byName = await client.callTool({
      arguments: {
        collection: LINKED,
        properties: { Etapa: 'en curso', Revisores: ['ana pérez', 'luis@example.com'] },
        title: 'Segunda',
      },
      name: 'create_row',
    });
    const byId = await client.callTool({
      arguments: { collection: LINKED, properties: { Etapa: 'stage003', Revisores: ['u-1'] }, title: 'Tercera' },
      name: 'create_row',
    });

    expect(byName.isError).toBeUndefined();
    expect(byId.isError).toBeUndefined();
    expect(rows.received.create?.[0]).toMatchObject({
      propertyValues: { reviewers: ['u-1', 'u-2'], stage: 'stage002' },
    });
    expect(rows.received.create?.[1]).toMatchObject({ propertyValues: { reviewers: ['u-1'], stage: 'stage003' } });
  });

  test('writes a date range and files by their ids', async () => {
    const { client, rows } = await connect();

    await client.callTool({
      arguments: {
        collection: LINKED,
        properties: { Archivos: ['file-1', 'file-2'], Ventana: '2026-10-20/2026-10-25' },
        title: 'Con fechas',
      },
      name: 'create_row',
    });

    expect(rows.received.create?.[0]).toMatchObject({
      propertyValues: { docs: ['file-1', 'file-2'], window: { end: '2026-10-25', start: '2026-10-20' } },
    });
  });

  test('never writes what Neuma fills in, and says so', async () => {
    const { client, rows } = await connect();

    const result = await client.callTool({
      arguments: { collection: LINKED, properties: { Código: 5 }, title: 'Con número' },
      name: 'create_row',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('filled in by Neuma');
    expect(rows.received.create).toEqual([]);
  });

  test('links the rows of a relation by title or id when the row is created, in one transaction after it exists', async () => {
    const { client, rows } = await connect();

    const result = await client.callTool({
      arguments: {
        collection: LINKED,
        properties: { Proyectos: { add: ['alfa', PROJECT_BETA] } },
        title: 'Con proyectos',
      },
      name: 'create_row',
    });

    expect(textOf(result)).toContain('Row created');
    expect(rows.received.create?.[0]).toMatchObject({ propertyValues: {} });
    expect(rows.received.changeRelations).toEqual([
      expect.objectContaining({
        changes: [
          { kind: 'ADD', propertyKey: 'projects', targetId: PROJECT_ALFA },
          { kind: 'ADD', propertyKey: 'projects', targetId: PROJECT_BETA },
        ],
        rowId: NEW_ROW,
      }),
    ]);
    expect(textOf(result)).toContain(PROJECT_ALFA);
  });

  test('takes a list as the whole relation and links only what is new', async () => {
    const { client, rows } = await connect();

    await client.callTool({
      arguments: { properties: { Proyectos: [PROJECT_BETA, 'Alfa'] }, row: LINKED_ROW },
      name: 'update_row',
    });

    expect(rows.received.changeRelations).toEqual([
      expect.objectContaining({ changes: [{ kind: 'ADD', propertyKey: 'projects', targetId: PROJECT_BETA }] }),
    ]);
    expect(rows.received.updateProperties).toEqual([]);
  });

  test('unlinks with remove and keeps links the token cannot read when it replaces the cell', async () => {
    const { client, rows } = await connect();

    await client.callTool({
      arguments: { properties: { Proyectos: { remove: ['Alfa'] } }, row: LINKED_ROW },
      name: 'update_row',
    });
    await client.callTool({ arguments: { properties: { Proyectos: [] }, row: LINKED_ROW }, name: 'update_row' });

    expect(rows.received.changeRelations?.[0]).toMatchObject({
      changes: [{ kind: 'REMOVE', propertyKey: 'projects', targetId: PROJECT_ALFA }],
    });
    expect(rows.received.changeRelations?.[1]).toMatchObject({
      changes: [{ kind: 'REMOVE', propertyKey: 'projects', targetId: PROJECT_ALFA }],
    });
  });

  test('asks for the page id when two rows share a title, and says which', async () => {
    const { client, rows } = await connect();

    const result = await client.callTool({
      arguments: { properties: { Proyectos: { add: ['Beta'] } }, row: LINKED_ROW },
      name: 'update_row',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(PROJECT_BETA);
    expect(textOf(result)).toContain(PROJECT_BETA_TWIN);
    expect(rows.received.changeRelations).toEqual([]);
  });

  test('does not offer, link or name a row of the other collection that the token has closed', async () => {
    const { client, rows } = await connect();

    const result = await client.callTool({
      arguments: { properties: { Proyectos: { add: ['Secreto'] } }, row: LINKED_ROW },
      name: 'update_row',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).not.toContain(PROJECT_CLOSED);
    expect(rows.received.changeRelations).toEqual([]);
  });

  test('refuses the whole update when the other side of a two-way relation cannot be edited', async () => {
    const { client, rows } = await connect(
      everyCollectionPermission,
      createRowStore(null, { code: 'RELATION_MIRROR_FORBIDDEN', details: 'x' }),
    );

    const result = await client.callTool({
      arguments: { properties: { Etapa: 'Entregada', Proyectos: { add: [PROJECT_BETA] } }, row: LINKED_ROW },
      name: 'update_row',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('other side of this two-way relation');
    expect(rows.received.updateProperties).toEqual([]);
  });

  test('takes back a row it created when its relations are refused, so nothing half made is left', async () => {
    const { client, rows } = await connect(
      everyCollectionPermission,
      createRowStore(null, { code: 'RELATION_MIRROR_FORBIDDEN', details: 'x' }),
    );

    const result = await client.callTool({
      arguments: { collection: LINKED, properties: { Proyectos: { add: ['Alfa'] } }, title: 'Nueva' },
      name: 'create_row',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('other side of this two-way relation');
    expect(rows.received.trash).toEqual([expect.objectContaining({ pageId: NEW_ROW })]);
  });

  test('says when a relation cell takes more than the limit of links', async () => {
    const { client } = await connect(
      everyCollectionPermission,
      createRowStore(null, {
        code: 'RELATION_LIMIT_EXCEEDED',
        details: 'A relation cell cannot point to more rows than its limit',
      }),
    );

    const result = await client.callTool({
      arguments: { properties: { Proyectos: { add: [PROJECT_BETA] } }, row: LINKED_ROW },
      name: 'update_row',
    });

    expect(textOf(result)).toContain('limit');
  });

  test('explains each property type in the description of the row tools', async () => {
    const { client } = await connect();

    const tools = (await client.listTools()).tools;
    const create = JSON.stringify(tools.find((tool) => tool.name === 'create_row'));
    const update = JSON.stringify(tools.find((tool) => tool.name === 'update_row'));

    for (const description of [create, update]) {
      expect(description).toContain('relation');
      expect(description).toContain('files');
      expect(description).toContain('status');
    }
    expect(create).toContain('unique id');
  });
});

describe('MCP collections — uploading a file to attach', () => {
  const content = Buffer.from('informe de ventas', 'utf8');
  const uploadArguments = (page: string, overrides: Record<string, unknown> = {}) => ({
    contentBase64: content.toString('base64'),
    contentType: 'text/plain',
    name: 'informe.txt',
    page,
    ...overrides,
  });

  test('stores the file on the row and answers the id to put in a files column', async () => {
    const { actions, client, rows } = await connect();

    const result = await client.callTool({ arguments: uploadArguments(ROW), name: 'upload_file' });

    expect(result.structuredContent).toMatchObject({ id: UPLOADED_FILE, name: 'informe.txt', size: content.length });
    expect(textOf(result)).toContain(UPLOADED_FILE);
    expect(rows.received.upload).toEqual([
      {
        buffer: 'informe de ventas',
        mimeType: 'text/plain',
        originalFilename: 'informe.txt',
        ownerId: 'user-1',
        pageId: ROW,
        role: 'WORKER',
        size: content.length,
        workspaceId: 'workspace-1',
      },
    ]);
    expect(summarizeActions(actions)).toEqual([{ outcome: 'DONE', pageId: ROW, tool: 'upload_file' }]);
  });

  test('refuses a file that is not valid base64, and stores nothing', async () => {
    const { client, rows } = await connect();

    const result = await client.callTool({
      arguments: uploadArguments(ROW, { contentBase64: 'esto no es base64!' }),
      name: 'upload_file',
    });

    expect(result.isError).toBe(true);
    expect(rows.received.upload).toEqual([]);
  });

  test('refuses a file past the size the portal accepts, before it is decoded', async () => {
    const { client, rows } = await connect();
    const tooBig = 'A'.repeat(Math.ceil((MAX_FILE_SIZE + 1) / 3) * 4);

    const result = await client.callTool({
      arguments: uploadArguments(ROW, { contentBase64: tooBig }),
      name: 'upload_file',
    });

    expect(result.isError).toBe(true);
    expect(rows.received.upload).toEqual([]);
  });

  test('refuses an empty file', async () => {
    const { client, rows } = await connect();

    const result = await client.callTool({
      arguments: uploadArguments(ROW, { contentBase64: '' }),
      name: 'upload_file',
    });

    expect(result.isError).toBe(true);
    expect(rows.received.upload).toEqual([]);
  });

  test('answers a page the token has closed as if it were not there', async () => {
    const { client, rows } = await connect();

    const result = await client.callTool({ arguments: uploadArguments(CLOSED_ROW), name: 'upload_file' });

    expect(textOf(result)).toBe(MCP_INACCESSIBLE_MESSAGE);
    expect(rows.received.upload).toEqual([]);
  });

  test('lets a token that writes pages, and not collections, attach a file to a page', async () => {
    const { client, rows } = await connect([ACCESS_TOKEN_PERMISSIONS.pagesWrite]);

    const result = await client.callTool({ arguments: uploadArguments(PLAIN_PAGE), name: 'upload_file' });

    expect(result.isError).not.toBe(true);
    expect(rows.received.upload).toHaveLength(1);
  });

  test('turns what the portal would refuse into a message the agent can act on', async () => {
    const { client } = await connect(
      everyCollectionPermission,
      createRowStore(null, null, { code: 'FILE_VALIDATION_FAILED', details: 'File MIME type is invalid' }),
    );

    const result = await client.callTool({
      arguments: uploadArguments(ROW, { contentType: 'application/x-msdownload' }),
      name: 'upload_file',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('File MIME type is invalid');
  });
});

describe('MCP collections — relation columns', () => {
  test('adds a relation column that links another collection, with its way back when asked', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({
      arguments: {
        addColumns: [{ name: 'Entregas', target: PROJECTS, twoWay: true, type: 'RELATION' }],
        collection: COLLECTION,
      },
      name: 'update_collection_columns',
    });

    expect(result.isError).toBeUndefined();
    expect(collections.received.defineSchema?.[0]).toMatchObject({
      properties: [
        { key: 'title' },
        { key: 'status' },
        { key: 'owner' },
        { config: { targetCollectionId: PROJECTS }, key: 'entregas', twoWay: true, type: 'RELATION' },
      ],
    });
  });

  test('asks which collection a relation links', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({
      arguments: { addColumns: [{ name: 'Entregas', type: 'RELATION' }], collection: COLLECTION },
      name: 'update_collection_columns',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('target');
    expect(collections.received.defineSchema).toEqual([]);
  });

  test('will not link a collection the token cannot read', async () => {
    const readsOnlyHere: McpPrincipal = {
      ...principalWith(everyCollectionPermission),
      access: {
        allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead, ACCESS_TOKEN_PERMISSIONS.collectionsConfigure],
        pages: [{ pageId: PROJECTS, permissions: [] }],
        spaces: [],
      },
    };
    const { client } = await connect([], createRowStore(), readsOnlyHere);

    const result = await client.callTool({
      arguments: { addColumns: [{ name: 'Entregas', target: PROJECTS, type: 'RELATION' }], collection: COLLECTION },
      name: 'update_collection_columns',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(MCP_INACCESSIBLE_MESSAGE);
  });
});

describe('MCP collections — columns and views', () => {
  test('renames an option through the path that rewrites its rows, and adds a column with a key made from its name', async () => {
    const { client, collections } = await connect();

    await client.callTool({
      arguments: {
        addColumns: [{ name: 'Prioridad', options: ['Alta', 'Baja'], type: 'SELECT' }],
        collection: COLLECTION,
        renameOptions: [{ column: 'Estado', from: 'hecho', to: 'Listo' }],
      },
      name: 'update_collection_columns',
    });

    expect(collections.received.rewriteOption?.[0]).toMatchObject({
      from: 'Hecho',
      optionId: 'done0001',
      propertyKey: 'status',
      to: 'Listo',
    });
    expect(collections.received.defineSchema?.[0]).toMatchObject({
      properties: [{ key: 'title' }, { key: 'status' }, { key: 'owner' }, { key: 'prioridad', label: 'Prioridad' }],
    });
  });

  test('says which options were already renamed when the new columns could not be saved afterwards', async () => {
    const permissions = everyCollectionPermission;
    const { client } = await connect(
      permissions,
      createRowStore(),
      principalWith(permissions),
      createCollectionStore(true),
    );

    const answer = await client.callTool({
      arguments: {
        addColumns: [{ name: 'Prioridad', type: 'RICH_TEXT' }],
        collection: COLLECTION,
        renameOptions: [{ column: 'Estado', from: 'hecho', to: 'Listo' }],
      },
      name: 'update_collection_columns',
    });

    expect(answer.isError).toBe(true);
    expect(textOf(answer)).toContain('Already done before it stopped: renamed "Hecho" to "Listo"');
  });

  test('refuses to change columns with a token that can only write rows', async () => {
    const { client, collections } = await connect([
      ACCESS_TOKEN_PERMISSIONS.collectionsRead,
      ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
    ]);

    const offered = (await client.listTools()).tools.map((tool) => tool.name);

    expect(offered).toContain('update_row');
    expect(offered).not.toContain('update_collection_columns');
    expect(collections.received.defineSchema).toEqual([]);
  });

  test('creates a board grouped by a column named by people, and makes it the default when asked', async () => {
    const { client, collections } = await connect();

    await client.callTool({
      arguments: { collection: COLLECTION, groupBy: 'Estado', makeDefault: true, name: 'Tablero', type: 'BOARD' },
      name: 'create_view',
    });

    expect(collections.received.defineSchema?.[0]).toMatchObject({
      views: [
        { isDefault: false, name: 'Tabla' },
        { configuration: { groupBy: 'status' }, isDefault: true, name: 'Tablero', type: 'BOARD' },
      ],
    });
  });

  test('changes only what a view shows without rewriting the whole collection', async () => {
    const { client, collections } = await connect();

    await client.callTool({
      arguments: { collection: COLLECTION, sort: [{ column: 'Estado', direction: 'ASCENDING' }], view: 'tabla' },
      name: 'update_view',
    });

    expect(collections.received.viewOperations?.[0]).toMatchObject({
      operations: [{ args: { direction: 'ASCENDING', propertyKey: 'status' }, command: 'sortSet' }],
      viewId: 'view-tabla',
    });
    expect(collections.received.defineSchema).toEqual([]);
  });

  test('sends nothing when a view already reads as asked', async () => {
    const { client, collections } = await connect();

    await client.callTool({
      arguments: { collection: COLLECTION, view: 'tabla', where: [] },
      name: 'update_view',
    });

    expect(collections.received.viewOperations).toEqual([]);
  });

  test('moves a row to the value of its column and beside another row in one write', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({
      arguments: { before: CLOSED_ROW, properties: { Estado: 'hecho' }, row: ROW, view: 'tabla' },
      name: 'move_row',
    });

    expect(result.isError).toBeUndefined();
    expect(collections.received.moveRow?.[0]).toMatchObject({
      before: CLOSED_ROW,
      pageId: COLLECTION,
      rowId: ROW,
      values: { status: 'done0001' },
      viewId: 'view-tabla',
    });
    expect(result.structuredContent).toMatchObject({ id: ROW });
  });

  test('refuses to place a row before and after at once, and says nothing was written', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({
      arguments: { after: CLOSED_ROW, before: CLOSED_ROW, row: ROW, view: 'Tabla' },
      name: 'move_row',
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('not both');
    expect(collections.received.moveRow).toEqual([]);
  });

  test('asks where the row goes when neither values nor a neighbour were given', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({ arguments: { row: ROW, view: 'Tabla' }, name: 'move_row' });

    expect(result.isError).toBe(true);
    expect(collections.received.moveRow).toEqual([]);
  });

  test('does not offer move_row to a token that cannot write rows', async () => {
    const { client } = await connect([ACCESS_TOKEN_PERMISSIONS.collectionsRead]);

    const offered = (await client.listTools()).tools.map((tool) => tool.name);

    expect(offered).not.toContain('move_row');
  });

  test('keeps the last view, saying why', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({ arguments: { collection: COLLECTION, view: 'Tabla' }, name: 'delete_view' });

    expect(textOf(result)).toContain('only view');
    expect(collections.received.defineSchema).toEqual([]);
  });
});
