import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenAccess, type AccessTokenPermission } from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import { MCP_INACCESSIBLE_MESSAGE, MCP_PAGE_LOCKED_MESSAGE } from '@/modules/mcp/constants/mcp.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, listMcpToolNames, readMcpText } from '../helpers/mcp.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';
/** Unique in the workspace: naming a person is ambiguous with duplicates. */
const OWNER_NAME = 'Ana Colecciones';

const { collectionsConfigure, collectionsRead, collectionsWrite, pagesRead, pagesWrite } = ACCESS_TOKEN_PERMISSIONS;

interface Session {
  readonly id: string;
  readonly token: string;
}

const queriedShape = z.object({ rows: z.array(z.object({ id: z.string() })), total: z.number() });
const writtenRowShape = z.object({ id: z.string() });

/** Cases check the database, not only the response: rejected writes change nothing, attempts are logged. */
describe('MCP collections (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let owner: Session;
  let spaceId = '';
  let otherSpaceId = '';
  let collectionId = '';
  let openRowId = '';
  let closedRowId = '';
  let lockedRowId = '';
  let tokenCount = 0;

  const signUp = async (label: string): Promise<Session> => {
    const email = `mcp-collections-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: OWNER_NAME, password: PASSWORD });
    await testApp.get(PrismaService).models.User.where({ email }).update({ role: 'ADMIN' });
    const session = await loginUser(testApp, email, PASSWORD);
    return { id: session.user.id, token: session.accessToken };
  };

  const api = () => request(testApp.getServer());

  const createSpace = async (name: string): Promise<string> => {
    const response = await api()
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name, slug: `${name.toLowerCase()}-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const createPage = async (title: string, parentId?: string, propertyValues?: Record<string, unknown>) => {
    const response = await api()
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
        title,
        ...(parentId === undefined ? {} : { parentId }),
        ...(propertyValues === undefined ? {} : { propertyValues }),
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const tokenFor = async (rules: Partial<AccessTokenAccess>): Promise<string> => {
    tokenCount += 1;
    const response = await api()
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        access: { allSpaces: [], pages: [], spaces: [], ...rules },
        name: `Agente de colecciones ${String(tokenCount)}`,
      })
      .expect(201);
    return (response.body as { secret: string }).secret;
  };

  const tokenEverywhere = (permissions: readonly AccessTokenPermission[]) => tokenFor({ allSpaces: [...permissions] });

  const call = (secret: string, name: string, args: Record<string, unknown>) =>
    callMcpTool(baseUrl, secret, name, args);

  const storedRow = (pageId: string) =>
    testApp.get(PrismaService).models.Page.select('propertyValues', 'title').where({ id: pageId }).all().firstOrThrow();

  const rowCount = async () =>
    (
      await testApp
        .get(PrismaService)
        .models.Page.where({ parentId: collectionId })
        .aggregate((aggregation) => ({ total: aggregation.count() }))
    ).total;

  const actionsOn = (pageId: string) =>
    testApp
      .get(PrismaService)
      .models.AgentAction.select('outcome', 'tool')
      .where({ pageId })
      .orderBy((action) => action.createdAt.asc())
      .all();

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);
    owner = await signUp('owner');
    spaceId = await createSpace('Tareas');
    otherSpaceId = await createSpace('Otro');

    collectionId = await createPage('Tablero');
    await api()
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        properties: [
          { key: 'title', label: 'Título', options: null, required: true, type: 'TITLE' },
          {
            key: 'status',
            label: 'Estado',
            options: [
              { color: 'GRAY', value: 'Por hacer' },
              { color: 'GREEN', value: 'Hecho' },
            ],
            required: false,
            type: 'SELECT',
          },
          { key: 'owner', label: 'Responsable', options: null, required: false, type: 'PERSON' },
        ],
        views: [{ configuration: {}, isDefault: true, name: 'Tabla', type: 'TABLE' }],
      })
      .expect(201);

    openRowId = await createPage('Escribir el informe', collectionId, { status: 'Por hacer' });
    closedRowId = await createPage('Sueldos', collectionId, { status: 'Por hacer' });
    lockedRowId = await createPage('Contrato firmado', collectionId, { status: 'Hecho' });
    await api()
      .patch(`/api/v1/spaces/${spaceId}/pages/${lockedRowId}/lock`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ locked: true })
      .expect(200);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('qué se le ofrece a cada token', () => {
    it('never offers a token that only reads collections a tool that writes', async () => {
      const offered = await listMcpToolNames(baseUrl, await tokenEverywhere([collectionsRead]));

      expect(offered).toContain('query_collection');
      expect(offered).not.toContain('create_row');
      expect(offered).not.toContain('update_row');
      expect(offered).not.toContain('update_collection_columns');
    });

    it('offers a token that writes rows no tool that changes columns or views', async () => {
      const offered = await listMcpToolNames(baseUrl, await tokenEverywhere([collectionsRead, collectionsWrite]));

      expect(offered).toContain('update_row');
      expect(offered).not.toContain('update_collection_columns');
      expect(offered).not.toContain('create_view');
    });
  });

  describe('escribir filas', () => {
    it('creates a row with options and people named as people see them, and records it as done', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsWrite]);

      const answer = await call(secret, 'create_row', {
        collection: collectionId,
        properties: { estado: 'hecho', Responsable: OWNER_NAME.toLowerCase() },
        text: 'Revisar las cláusulas.',
        title: 'Revisar contrato',
      });

      expect(answer.isError).toBeUndefined();
      const created = writtenRowShape.parse(answer.structuredContent);
      expect(await storedRow(created.id)).toEqual({
        propertyValues: { owner: owner.id, status: 'Hecho' },
        title: 'Revisar contrato',
      });
      expect(await actionsOn(created.id)).toContainEqual({ outcome: 'DONE', tool: 'create_row' });
    });

    it('refuses an option the column does not have without creating anything, and records the refusal', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsWrite]);
      const before = await rowCount();

      const answer = await call(secret, 'create_row', {
        collection: collectionId,
        properties: { Estado: 'Bloqueado' },
        title: 'No debería existir',
      });

      expect(answer.isError).toBe(true);
      expect(readMcpText(answer)).toContain('Por hacer, Hecho');
      expect(await rowCount()).toBe(before);
      expect(await actionsOn(collectionId)).toContainEqual({ outcome: 'REFUSED', tool: 'create_row' });
    });

    it('refuses to create a row where the token only writes in another space', async () => {
      const secret = await tokenFor({
        allSpaces: [collectionsRead],
        spaces: [{ permissions: [collectionsRead, collectionsWrite], spaceId: otherSpaceId }],
      });
      const before = await rowCount();

      const answer = await call(secret, 'create_row', { collection: collectionId, title: 'No debería existir' });

      expect(readMcpText(answer)).toBe(MCP_INACCESSIBLE_MESSAGE);
      expect(await rowCount()).toBe(before);
    });

    it('moves a task and renames it in the same write', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsWrite]);

      const answer = await call(secret, 'update_row', {
        properties: { Estado: 'Hecho' },
        row: openRowId,
        title: 'Informe entregado',
      });

      expect(answer.isError).toBeUndefined();
      expect(await storedRow(openRowId)).toEqual({ propertyValues: { status: 'Hecho' }, title: 'Informe entregado' });
      expect(await actionsOn(openRowId)).toContainEqual({ outcome: 'DONE', tool: 'update_row' });
    });

    it('tells the agent a locked row needs a person, leaves it as it was, and records the refusal', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsWrite]);

      const answer = await call(secret, 'update_row', { properties: { Estado: 'Por hacer' }, row: lockedRowId });

      expect(readMcpText(answer)).toBe(MCP_PAGE_LOCKED_MESSAGE);
      expect(await storedRow(lockedRowId)).toEqual({ propertyValues: { status: 'Hecho' }, title: 'Contrato firmado' });
      expect(await actionsOn(lockedRowId)).toEqual([{ outcome: 'REFUSED', tool: 'update_row' }]);
    });
  });

  describe('una fila cerrada en un tablero abierto', () => {
    const closedRowToken = () =>
      tokenFor({
        allSpaces: [pagesRead, collectionsRead, collectionsWrite],
        pages: [{ pageId: closedRowId, permissions: [] }],
      });

    it('leaves the closed row out of a query, and out of the count', async () => {
      const answer = await call(await closedRowToken(), 'query_collection', { collection: collectionId, limit: 200 });

      const queried = queriedShape.parse(answer.structuredContent);
      expect(queried.rows.map((row) => row.id)).not.toContain(closedRowId);
      expect(queried.rows.map((row) => row.id)).toContain(lockedRowId);
      expect(queried.total).toBe(queried.rows.length);
    });

    it('answers a change to the closed row as if it were not there, and leaves it as it was', async () => {
      const answer = await call(await closedRowToken(), 'update_row', { row: closedRowId, title: 'Filtrado' });

      expect(readMcpText(answer)).toBe(MCP_INACCESSIBLE_MESSAGE);
      expect((await storedRow(closedRowId)).title).toBe('Sueldos');
      expect(await actionsOn(closedRowId)).toEqual([]);
    });
  });

  // A page under a collection is a row, so the page tools need collection write access like create_row.
  describe('las herramientas de páginas sobre las filas de una colección', () => {
    it('refuses to create, rename, move or copy a row to a token that only writes pages, changing nothing', async () => {
      const secret = await tokenEverywhere([pagesRead, pagesWrite]);
      const before = await rowCount();
      const titleBefore = (await storedRow(openRowId)).title;

      const answers = await Promise.all([
        call(secret, 'create_page', { parent: collectionId, title: 'Colada' }),
        call(secret, 'update_page', { page: openRowId, title: 'Renombrada' }),
        call(secret, 'duplicate_page', { page: openRowId }),
        call(secret, 'move_page', { page: openRowId, space: otherSpaceId }),
      ]);

      for (const answer of answers) expect(answer.isError).toBe(true);
      expect(await rowCount()).toBe(before);
      expect((await storedRow(openRowId)).title).toBe(titleBefore);
    });

    it('lets a token that also writes collections create a row as a page', async () => {
      const secret = await tokenEverywhere([pagesRead, pagesWrite, collectionsWrite]);
      const before = await rowCount();

      const answer = await call(secret, 'create_page', { parent: collectionId, title: 'Con permiso' });

      expect(answer.isError).toBeUndefined();
      expect(await rowCount()).toBe(before + 1);
    });
  });

  describe('un token que cambia la colección sin poder leerla', () => {
    it('confirms a new view without handing back the title, the columns or the other views', async () => {
      const secret = await tokenEverywhere([collectionsConfigure]);

      const answer = await call(secret, 'create_view', { collection: collectionId, name: 'Sin leer', type: 'TABLE' });

      expect(answer.isError).toBeUndefined();
      const said = JSON.stringify(answer);
      expect(said).not.toContain('Tablero');
      expect(said).not.toContain('Estado');
      expect(said).not.toContain('Tabla');
    });

    it('refuses a column it does not find without naming the ones there are', async () => {
      const secret = await tokenEverywhere([collectionsConfigure]);

      const answer = await call(secret, 'create_view', {
        collection: collectionId,
        groupBy: 'columna que no existe',
        name: 'Agrupada',
        type: 'BOARD',
      });

      expect(answer.isError).toBe(true);
      expect(JSON.stringify(answer)).not.toContain('Estado');
    });

    it('refuses an option it does not find without naming the ones there are', async () => {
      const secret = await tokenEverywhere([collectionsWrite]);

      const answer = await call(secret, 'create_row', {
        collection: collectionId,
        properties: { Estado: 'Archivado' },
        title: 'Otra',
      });

      expect(answer.isError).toBe(true);
      expect(JSON.stringify(answer)).not.toContain('Por hacer');
    });

    it('still names the columns and options to a token that may read the collection', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsWrite]);

      const answer = await call(secret, 'create_row', {
        collection: collectionId,
        properties: { Estado: 'Archivado' },
        title: 'Otra',
      });

      expect(JSON.stringify(answer)).toContain('Por hacer');
    });
  });

  describe('configurar la colección', () => {
    it('creates a board grouped by a column named by people, stored as the portal stores it', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsConfigure]);

      const answer = await call(secret, 'create_view', {
        collection: collectionId,
        groupBy: 'estado',
        name: 'Tablero',
        type: 'BOARD',
      });

      expect(answer.isError).toBeUndefined();
      const view = await testApp
        .get(PrismaService)
        .models.PageSchemaView.select('configuration', 'type')
        .where({ name: 'Tablero', pageId: collectionId })
        .all()
        .firstOrThrow();
      expect(view).toMatchObject({ configuration: { groupBy: 'status' }, type: 'BOARD' });
    });

    it('renames an option and rewrites the rows that had it', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsConfigure]);

      const answer = await call(secret, 'update_collection_columns', {
        collection: collectionId,
        renameOptions: [{ column: 'Estado', from: 'hecho', to: 'Listo' }],
      });

      expect(answer.isError).toBeUndefined();
      expect((await storedRow(lockedRowId)).propertyValues).toEqual({ status: 'Listo' });
    });
  });
});
