import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import { ACCESS_TOKEN_PERMISSIONS, type AccessTokenAccess, type AccessTokenPermission } from '@company-brain/shared';
import request from 'supertest';
import { z } from 'zod';
import { MCP_INACCESSIBLE_MESSAGE, MCP_PAGE_LOCKED_MESSAGE } from '@/modules/mcp/constants/mcp.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, listMcpToolNames, readMcpText } from '../helpers/mcp.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';

const { collectionsConfigure, collectionsRead, collectionsWrite, pagesRead } = ACCESS_TOKEN_PERMISSIONS;

interface Session {
  readonly id: string;
  readonly token: string;
}

const queriedShape = z.object({ rows: z.array(z.object({ id: z.string() })), total: z.number() });
const writtenRowShape = z.object({ id: z.string() });

/**
 * Lo que un agente puede hacer con una colección, de punta a punta: token
 * creado por la API, cliente MCP de verdad por HTTP, y la colección en
 * Postgres. Cada caso mira la base, no solo la respuesta: una escritura
 * rechazada tiene que no haber tocado nada, y toda escritura intentada tiene
 * que quedar anotada.
 */
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
    await registerUser(testApp, { email, name: 'Ana Pérez', password: PASSWORD });
    await testApp.get(PrismaService).user.update({ data: { role: 'ADMIN' }, where: { email } });
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
    testApp.get(PrismaService).page.findUniqueOrThrow({
      select: { propertyValues: true, title: true },
      where: { id: pageId },
    });

  const rowCount = () => testApp.get(PrismaService).page.count({ where: { parentId: collectionId } });

  const actionsOn = (pageId: string) =>
    testApp.get(PrismaService).agentAction.findMany({
      orderBy: { createdAt: 'asc' },
      select: { outcome: true, tool: true },
      where: { pageId },
    });

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
        properties: { estado: 'hecho', Responsable: 'ana pérez' },
        text: 'Revisar las cláusulas.',
        title: 'Revisar contrato',
      });

      expect(answer.isError).toBeUndefined();
      const created = writtenRowShape.parse(answer.structuredContent);
      expect(await storedRow(created.id)).toEqual({
        propertyValues: { owner: owner.id, status: 'Hecho' },
        title: 'Revisar contrato',
      });
      expect(await actionsOn(collectionId)).toContainEqual({ outcome: 'DONE', tool: 'create_row' });
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
      const view = await testApp.get(PrismaService).pageSchemaView.findFirstOrThrow({
        select: { configuration: true, type: true },
        where: { name: 'Tablero', pageId: collectionId },
      });
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
