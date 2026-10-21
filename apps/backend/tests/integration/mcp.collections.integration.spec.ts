import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import {
  ACCESS_TOKEN_PERMISSIONS,
  type AccessTokenAccess,
  type AccessTokenPermission,
  type BlockDocumentRow,
  blocksToDocument,
} from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import { MCP_INACCESSIBLE_MESSAGE, MCP_PAGE_LOCKED_MESSAGE } from '@/modules/mcp/constants/mcp.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, listMcpToolNames, readMcpText } from '../helpers/mcp.helper';
import { countChildPages, readStoredPage } from '../helpers/mcp.stored-page.helper';
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
  let todoId = '';
  let doneId = '';
  let tokenCount = 0;

  const signUp = async (label: string, role: 'ADMIN' | 'WORKER' = 'ADMIN'): Promise<Session> => {
    const email = `mcp-collections-${label}-${String(Date.now())}@test.com`;
    await createAccount(testApp, {
      email,
      name: role === 'ADMIN' ? OWNER_NAME : `Trabajador ${label}`,
      password: PASSWORD,
    });
    await testApp.get(PrismaService).models.User.where({ email }).update({ role });
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

  const tokenFor = async (rules: Partial<AccessTokenAccess>, session: Session = owner): Promise<string> => {
    tokenCount += 1;
    const response = await api()
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${session.token}`)
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

  const storedRow = async (pageId: string) => {
    const { propertyValues, title } = await readStoredPage(testApp, owner.token, pageId);
    return { propertyValues, title };
  };

  const rowCount = () => countChildPages(testApp, collectionId);

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
    const defined = await api()
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
    const options = (
      defined.body as { properties: { key: string; options?: { id: string; value: string }[] }[] }
    ).properties.find((property) => property.key === 'status')?.options;
    todoId = options?.find((option) => option.value === 'Por hacer')?.id ?? '';
    doneId = options?.find((option) => option.value === 'Hecho')?.id ?? '';

    openRowId = await createPage('Escribir el informe', collectionId, { status: todoId });
    closedRowId = await createPage('Sueldos', collectionId, { status: todoId });
    lockedRowId = await createPage('Contrato firmado', collectionId, { status: doneId });
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
        propertyValues: { owner: [owner.id], status: doneId },
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
      expect(await storedRow(openRowId)).toEqual({ propertyValues: { status: doneId }, title: 'Informe entregado' });
      expect(await actionsOn(openRowId)).toContainEqual({ outcome: 'DONE', tool: 'update_row' });
    });

    it('tells the agent a locked row needs a person, leaves it as it was, and records the refusal', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsWrite]);

      const answer = await call(secret, 'update_row', { properties: { Estado: 'Por hacer' }, row: lockedRowId });

      expect(readMcpText(answer)).toBe(MCP_PAGE_LOCKED_MESSAGE);
      expect(await storedRow(lockedRowId)).toEqual({ propertyValues: { status: doneId }, title: 'Contrato firmado' });
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

    it('renames an option and leaves the rows that had it as they were, since they hold its id', async () => {
      const secret = await tokenEverywhere([collectionsRead, collectionsConfigure]);

      const answer = await call(secret, 'update_collection_columns', {
        collection: collectionId,
        renameOptions: [{ column: 'Estado', from: 'por hacer', to: 'Pendiente' }],
      });

      expect(answer.isError).toBeUndefined();
      expect((await storedRow(closedRowId)).propertyValues).toEqual({ status: todoId });
    });
  });

  describe('relaciones, estados, archivos y personas', () => {
    let projectsId = '';
    let alfaId = '';
    let betaId = '';
    let relatedKey = '';
    let writerSecret = '';

    const projectPropertyValues = async (pageId: string) => (await storedRow(pageId)).propertyValues;

    beforeAll(async () => {
      projectsId = await createPage('Proyectos');
      await api()
        .post(`/api/v1/spaces/${spaceId}/pages/${projectsId}/schema`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({
          properties: [{ key: 'title', label: 'Nombre', options: null, required: true, type: 'TITLE' }],
          views: [{ configuration: {}, isDefault: true, name: 'Tabla', type: 'TABLE' }],
        })
        .expect(201);
      alfaId = await createPage('Alfa', projectsId);
      betaId = await createPage('Beta', projectsId);
      writerSecret = await tokenEverywhere([collectionsRead, collectionsWrite, collectionsConfigure]);
      const added = await call(writerSecret, 'update_collection_columns', {
        addColumns: [
          { name: 'Proyectos', target: projectsId, twoWay: true, type: 'RELATION' },
          { name: 'Etapa', type: 'STATUS' },
          { name: 'Archivos', type: 'FILES' },
          { name: 'Ticket', prefix: 'TK', type: 'UNIQUE_ID' },
          { multiple: true, name: 'Revisores', type: 'PERSON' },
          { name: 'Ventana', type: 'DATE' },
        ],
        collection: collectionId,
      });
      expect(added.isError).toBeUndefined();
      relatedKey = 'proyectos';
    });

    it('creates the column with its way back in the other collection', async () => {
      const schema = await api()
        .get(`/api/v1/spaces/${spaceId}/pages/${projectsId}/schema`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);

      const keys = (schema.body as { properties: { key: string; type: string }[] }).properties;
      expect(keys.some((property) => property.type === 'RELATION')).toBe(true);
    });

    it('creates a row linked to two projects, with a status by name, a person by email and a range', async () => {
      const answer = await call(writerSecret, 'create_row', {
        collection: collectionId,
        properties: {
          Etapa: 'En curso',
          Proyectos: { add: ['alfa', betaId] },
          Revisores: [OWNER_NAME.toLowerCase()],
          Ventana: '2026-10-20/2026-10-25',
        },
        title: 'Con relaciones',
      });

      expect(answer.isError).toBeUndefined();
      const rowId = writtenRowShape.parse(answer.structuredContent).id;
      const stored = await projectPropertyValues(rowId);
      expect(stored).toMatchObject({ ventana: { end: '2026-10-25', start: '2026-10-20' } });
      expect([...((stored?.[relatedKey] ?? []) as string[])].sort()).toEqual([alfaId, betaId].sort());
      expect(stored?.revisores).toEqual([owner.id]);
      expect(typeof stored?.ticket).toBe('number');
      const mirror = Object.values((await projectPropertyValues(alfaId)) ?? {}).flat();
      expect(mirror).toContain(rowId);
    });

    it('unlinks a project and keeps the other, and the way back follows', async () => {
      const created = await call(writerSecret, 'create_row', {
        collection: collectionId,
        properties: { Proyectos: [alfaId, betaId] },
        title: 'Para desligar',
      });
      const rowId = writtenRowShape.parse(created.structuredContent).id;

      const answer = await call(writerSecret, 'update_row', {
        properties: { Proyectos: { remove: ['Alfa'] } },
        row: rowId,
      });

      expect(answer.isError).toBeUndefined();
      expect((await projectPropertyValues(rowId))?.[relatedKey]).toEqual([betaId]);
      expect(Object.values((await projectPropertyValues(alfaId)) ?? {}).flat()).not.toContain(rowId);
    });

    it('opens as a document a collection whose rows were made by the API and by an agent', async () => {
      const apiRowId = await createPage('Fila por API', collectionId);
      const made = await call(writerSecret, 'create_row', { collection: collectionId, title: 'Fila por MCP' });
      const agentRowId = writtenRowShape.parse(made.structuredContent).id;

      const synced = await api()
        .post('/api/v1/sync')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ pageId: collectionId })
        .expect(200);
      const blocks = (synced.body as { blocks: BlockDocumentRow[] }).blocks;
      const page = blocks.find((block) => block.id === collectionId);
      const document = blocksToDocument(
        page as BlockDocumentRow,
        blocks.filter((block) => block.id !== collectionId),
      );

      const syncedIds = blocks.map((block) => block.id);
      expect(syncedIds).toContain(apiRowId);
      expect(syncedIds).toContain(agentRowId);
      expect(document.isOk()).toBe(true);
    });

    it('stores a file sent as base64 on a row, and attaches it by the id it answers', async () => {
      const rowId = await createPage('Con adjunto', collectionId);
      const bytes = Buffer.from('informe de ventas', 'utf8');

      const uploaded = await call(writerSecret, 'upload_file', {
        contentBase64: bytes.toString('base64'),
        contentType: 'text/plain',
        name: 'informe.txt',
        page: rowId,
      });
      const fileId = z.object({ id: z.string() }).parse(uploaded.structuredContent).id;
      const attached = await call(writerSecret, 'update_row', { properties: { Archivos: [fileId] }, row: rowId });

      expect(uploaded.isError).toBeUndefined();
      expect(attached.isError).toBeUndefined();
      expect((await projectPropertyValues(rowId))?.archivos).toEqual([fileId]);
      const downloaded = await api()
        .get(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);
      expect(downloaded.text).toBe('informe de ventas');
    });

    it('refuses the types the portal refuses, and stores nothing', async () => {
      const rowId = await createPage('Sin adjunto', collectionId);

      const answer = await call(writerSecret, 'upload_file', {
        contentBase64: Buffer.from('MZ').toString('base64'),
        contentType: 'application/x-msdownload',
        name: 'virus.exe',
        page: rowId,
      });

      expect(answer.isError).toBe(true);
      const listed = await api()
        .get(`/api/v1/files/page/${rowId}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);
      expect(listed.body).toEqual([]);
    });

    it('refuses to upload to a page the token has closed, as if it were not there', async () => {
      const secret = await tokenFor({
        allSpaces: [pagesRead, pagesWrite],
        pages: [{ pageId: closedRowId, permissions: [] }],
      });

      const answer = await call(secret, 'upload_file', {
        contentBase64: Buffer.from('x').toString('base64'),
        contentType: 'text/plain',
        name: 'x.txt',
        page: closedRowId,
      });

      expect(answer.isError).toBe(true);
      expect(readMcpText(answer)).toBe(MCP_INACCESSIBLE_MESSAGE);
    });

    it('refuses the whole link, naming the other side, when a worker cannot edit the row there', async () => {
      const worker = await signUp('worker', 'WORKER');
      const secret = await tokenFor({ allSpaces: [collectionsRead, collectionsWrite] }, worker);
      const rowId = await createPage('Fila del trabajador', collectionId);
      const sealedProjectId = await createPage('Solo lectura', projectsId);
      await testApp
        .get(PrismaService)
        .models.Block.where({ id: sealedProjectId })
        .update({ permissions: [{ principal: { kind: 'space' }, role: 'reader' }] });

      const answer = await call(secret, 'update_row', {
        properties: { Proyectos: { add: [sealedProjectId] } },
        row: rowId,
      });

      expect(answer.isError).toBe(true);
      expect(readMcpText(answer)).toContain('The other side of this two-way relation');
      expect((await projectPropertyValues(rowId))?.[relatedKey] ?? []).toEqual([]);
      expect(Object.values((await projectPropertyValues(sealedProjectId)) ?? {}).flat()).not.toContain(rowId);
    });

    it('refuses to write the unique id, and creates nothing', async () => {
      const before = await rowCount();

      const answer = await call(writerSecret, 'create_row', {
        collection: collectionId,
        properties: { Ticket: 99 },
        title: 'Con número propio',
      });

      expect(answer.isError).toBe(true);
      expect(await rowCount()).toBe(before);
    });

    it('refuses a project the token has closed, as if there were none by that name', async () => {
      const closedProject = await createPage('Reservado', projectsId);
      const secret = await tokenFor({
        allSpaces: [collectionsRead, collectionsWrite],
        pages: [{ pageId: closedProject, permissions: [] }],
      });

      const answer = await call(secret, 'create_row', {
        collection: collectionId,
        properties: { Proyectos: { add: ['Reservado'] } },
        title: 'Hacia lo cerrado',
      });

      expect(answer.isError).toBe(true);
      expect(readMcpText(answer)).not.toContain(closedProject);
    });
  });
});
