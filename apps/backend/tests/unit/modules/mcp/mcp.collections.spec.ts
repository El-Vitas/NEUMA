import { describe, expect, test } from 'bun:test';
import {
  ACCESS_TOKEN_PERMISSIONS,
  type AccessTokenPermission,
  PAGE_OPTION_COLOR,
  type PagePropertyValues,
  Result,
  USER_ROLE,
} from '@company-brain/shared';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import type { AccessTokenPlaceReader } from '../../../../src/common/types/access-token.types';
import {
  MCP_INACCESSIBLE_MESSAGE,
  MCP_NOT_A_COLLECTION_MESSAGE,
  MCP_NOT_A_ROW_MESSAGE,
  MCP_PAGE_LOCKED_MESSAGE,
} from '../../../../src/modules/mcp/constants/mcp.constants';
import { createMcpServer } from '../../../../src/modules/mcp/mcp.server';
import type {
  McpCollectionService,
  McpCollectionShape,
  McpRefusal,
  McpRowWriter,
  McpWrittenRow,
} from '../../../../src/modules/mcp/types/mcp.collections.types';
import type {
  McpActionEntry,
  McpPageSource,
  McpPrincipal,
  McpServerDependencies,
} from '../../../../src/modules/mcp/types/mcp.types';
import { createUnusedPageManager } from '../../../helpers/mcp.page-manager.helper';

const SPACE = '00000000-0000-4000-8000-00000000000a';
const OTHER_SPACE = '00000000-0000-4000-8000-00000000000b';
const COLLECTION = '11111111-1111-4111-8111-111111111111';
const ROW = '22222222-2222-4222-8222-222222222222';
const CLOSED_ROW = '33333333-3333-4333-8333-333333333333';
const PLAIN_PAGE = '44444444-4444-4444-8444-444444444444';
const NEW_ROW = '55555555-5555-4555-8555-555555555555';

const everyCollectionPermission: readonly AccessTokenPermission[] = [
  ACCESS_TOKEN_PERMISSIONS.collectionsRead,
  ACCESS_TOKEN_PERMISSIONS.collectionsWrite,
  ACCESS_TOKEN_PERMISSIONS.collectionsConfigure,
];

/** Un token que hace todo con colecciones, salvo en una fila que tiene cerrada. */
const principalWith = (allSpaces: readonly AccessTokenPermission[]): McpPrincipal => ({
  access: { allSpaces, pages: [{ pageId: CLOSED_ROW, permissions: [] }], spaces: [] },
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
  [ROW, pageSource(ROW, 'Escribir el informe', COLLECTION, { owner: 'u-1', status: 'Por hacer' })],
  [CLOSED_ROW, pageSource(CLOSED_ROW, 'Sueldos', COLLECTION, { status: 'Hecho' })],
  [PLAIN_PAGE, pageSource(PLAIN_PAGE, 'Notas', null, null)],
]);

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
    { key: 'title', label: 'Título', options: null, required: true, type: 'TITLE' },
    {
      key: 'status',
      label: 'Estado',
      options: [
        { color: PAGE_OPTION_COLOR.GRAY, value: 'Por hacer' },
        { color: PAGE_OPTION_COLOR.GREEN, value: 'Hecho' },
      ],
      required: false,
      type: 'SELECT',
    },
    { key: 'owner', label: 'Responsable', options: null, required: false, type: 'PERSON' },
  ],
  views: [{ configuration: {}, isDefault: true, name: 'Tabla', type: 'TABLE' }],
};

/** Una colección en memoria que guarda lo que se le pide, para ver qué llegó al servicio. */
const createCollectionStore = (refusesTheShape = false) => {
  let shape = initialShape;
  const received: Record<string, unknown[]> = { defineSchema: [], queryRows: [], rewriteOption: [], setView: [] };
  const service: McpCollectionService = {
    defineSchema: (input) => {
      received.defineSchema?.push(input);
      if (refusesTheShape)
        return Promise.resolve(Result.fail({ code: 'SCHEMA_PROPERTY_DEFINITION_INVALID', details: undefined }));
      shape = { properties: input.properties, views: input.views };
      return Promise.resolve(Result.ok(shape));
    },
    getSchema: (pageId) => Promise.resolve(Result.ok(pageId === COLLECTION ? shape : { properties: [], views: [] })),
    queryRows: (input) => {
      received.queryRows?.push(input);
      const rows = [ROW, CLOSED_ROW].map((id) => ({
        ...pageSource(id, pages.get(id)?.title ?? '', COLLECTION, pages.get(id)?.propertyValues ?? null),
      }));
      return Promise.resolve(Result.ok({ hasMore: false, rows }));
    },
    rewriteOption: (input) => {
      received.rewriteOption?.push(input);
      return Promise.resolve(Result.ok(shape));
    },
    setViewConfiguration: (input) => {
      received.setView?.push(input);
      return Promise.resolve(Result.ok(shape));
    },
  };
  return { received, service };
};

const written = (id: string, title: string, values: PagePropertyValues | null): McpWrittenRow => ({
  id,
  propertyValues: values,
  spaceId: SPACE,
  title,
});

/** Filas que se escriben en memoria; una fila bloqueada rechaza como lo hace el servicio de páginas. */
const createRowStore = (refusal: McpRefusal | null = null) => {
  const received: Record<string, unknown[]> = { create: [], rename: [], updateProperties: [] };
  const answer = (row: McpWrittenRow) =>
    Promise.resolve(
      refusal === null ? Result.ok<McpWrittenRow, McpRefusal>(row) : Result.fail<McpWrittenRow, McpRefusal>(refusal),
    );
  const writer: McpRowWriter = {
    create: (input) => {
      received.create?.push(input);
      return answer(written(NEW_ROW, input.title, input.propertyValues));
    },
    rename: (pageId, title) => {
      received.rename?.push({ pageId, title });
      return answer(written(pageId, title, { status: 'Hecho' }));
    },
    updateProperties: (input) => {
      received.updateProperties?.push(input);
      return answer(written(input.pageId, 'Escribir el informe', { status: 'Hecho' }));
    },
  };
  return { received, writer };
};

const notUsedHere = (): Promise<never> => Promise.reject(new Error('Not used in this test'));

/** Una acción anotada por el registro falso, con cómo terminó. */
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
    drawings: { checkDiagram: notUsedHere, checkFormula: () => Result.ok('') },
    pages: createUnusedPageManager(),
    observer: { callFinished: () => undefined, unexpected: () => undefined },
    outline: { listAncestors: notUsedHere, listChildren: notUsedHere, listReadable: notUsedHere },
    pagesService: {
      getAccessible: (pageId) => {
        const found = pages.get(pageId);
        return Promise.resolve(found === undefined ? Result.fail(new Error('No page')) : Result.ok(found));
      },
    },
    people: { listAssignableMembers: () => Promise.resolve([{ id: 'u-1', name: 'Ana Pérez' }]) },
    placeReader,
    portalUrl: 'https://brain.example.com',
    principalResolver: { resolve: () => Promise.resolve(principal) },
    rows: rows.writer,
    searchService: { locateBlock: notUsedHere, search: notUsedHere, searchBlocks: notUsedHere },
    spacesService: { listAccessible: notUsedHere },
    workspacesService: { resolveForUser: () => Promise.resolve({ id: 'workspace-1', name: 'Company Brain' }) },
  };
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'mcp-collections-test', version: '1.0.0' });
  await createMcpServer(dependencies, principal).connect(serverSide);
  await client.connect(clientSide);
  return { actions, client, collections, rows };
};

type ToolResult = Awaited<ReturnType<Client['callTool']>>;

/** Lo anotado de cada escritura, sin quién la hizo: qué herramienta, sobre qué página y cómo terminó. */
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

    expect(collections.received.queryRows?.[0]).toMatchObject({
      configuration: { filter: { conditions: [{ operator: 'IS', propertyKey: 'owner', value: 'u-1' }] } },
      viewName: null,
    });
    expect(result.structuredContent).toMatchObject({ rows: [{ id: ROW }], total: 1 });
    expect(textOf(result)).toContain('Responsable: Ana Pérez (u-1)');
    expect(textOf(result)).not.toContain('Sueldos');
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
      propertyValues: { owner: 'u-1', status: 'Hecho' },
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
      expect.objectContaining({ pageId: ROW, propertyValues: { status: 'Hecho' }, title: 'Informe entregado' }),
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
      propertyKey: 'status',
      to: 'Listo',
    });
    expect(collections.received.defineSchema?.[0]).toMatchObject({
      properties: [{ key: 'title' }, { key: 'status' }, { key: 'owner' }, { key: 'prioridad', label: 'Prioridad' }],
    });
  });

  /** Las opciones ya reescribieron sus filas: si la forma no se guarda, el agente tiene que saberlo para no repetirlo. */
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

    expect(collections.received.setView?.[0]).toMatchObject({
      configuration: { sorts: [{ direction: 'ASCENDING', propertyKey: 'status' }] },
      viewName: 'Tabla',
    });
    expect(collections.received.defineSchema).toEqual([]);
  });

  test('keeps the last view, saying why', async () => {
    const { client, collections } = await connect();

    const result = await client.callTool({ arguments: { collection: COLLECTION, view: 'Tabla' }, name: 'delete_view' });

    expect(textOf(result)).toContain('only view');
    expect(collections.received.defineSchema).toEqual([]);
  });
});
