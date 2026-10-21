import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import request from 'supertest';
import { z } from 'zod';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { callMcpTool, listenForMcp, listMcpToolNames, readMcpText } from '../helpers/mcp.helper';
import { readStoredPage } from '../helpers/mcp.stored-page.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';
const OWNER_NAME = 'Ana Plantillas';

const { collectionsConfigure, collectionsRead, collectionsWrite, pagesRead, pagesTrash } = ACCESS_TOKEN_PERMISSIONS;

const templateShape = z.object({
  id: z.string(),
  isDefault: z.boolean(),
  title: z.string(),
  variables: z.array(z.object({ column: z.string(), word: z.string() })),
});
const listingShape = z.object({ defaultTemplateId: z.string().nullable(), templates: z.array(templateShape) });
const queriedShape = z.object({ rows: z.array(z.object({ title: z.string() })), total: z.number() });
const rowShape = z.object({ id: z.string() });

describe('MCP templates (Integration)', () => {
  let testApp: TestApp;
  let baseUrl: string;
  let ownerId = '';
  let ownerToken = '';
  let spaceId = '';
  let collectionId = '';
  let doneId = '';
  let tokenCount = 0;

  const api = () => request(testApp.getServer());

  const tokenWith = async (permissions: readonly string[]): Promise<string> => {
    tokenCount += 1;
    const response = await api()
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        access: { allSpaces: [...permissions], pages: [], spaces: [] },
        name: `Agente de plantillas ${String(tokenCount)}`,
      })
      .expect(201);
    return (response.body as { secret: string }).secret;
  };

  const call = (secret: string, name: string, args: Record<string, unknown>) =>
    callMcpTool(baseUrl, secret, name, args);

  const listing = async (secret: string) => {
    const answer = await call(secret, 'list_templates', { collection: collectionId });
    expect(answer.isError).toBeUndefined();
    return listingShape.parse(answer.structuredContent);
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    baseUrl = await listenForMcp(testApp);
    const email = `mcp-templates-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: OWNER_NAME, password: PASSWORD });
    await testApp.get(PrismaService).models.User.where({ email }).update({ role: 'ADMIN' });
    const session = await loginUser(testApp, email, PASSWORD);
    ownerToken = session.accessToken;
    ownerId = session.user.id;
    const space = await api()
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Plantillas',
        slug: `plantillas-${String(Date.now())}`,
        visibility: SpaceVisibility.PUBLIC_INTERNAL,
      })
      .expect(201);
    spaceId = (space.body as { id: string }).id;
    const page = await api()
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        content: { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' },
        title: 'Tablero',
      })
      .expect(201);
    collectionId = (page.body as { id: string }).id;
    const defined = await api()
      .post(`/api/v1/spaces/${spaceId}/pages/${collectionId}/schema`)
      .set('Authorization', `Bearer ${ownerToken}`)
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
          { key: 'due', label: 'Vence', options: null, required: false, type: 'DATE' },
        ],
        views: [{ configuration: {}, isDefault: true, name: 'Tabla', type: 'TABLE' }],
      })
      .expect(201);
    const options = (
      defined.body as { properties: { key: string; options?: { id: string; value: string }[] }[] }
    ).properties.find((property) => property.key === 'status')?.options;
    doneId = options?.find((option) => option.value === 'Hecho')?.id ?? '';
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('offers the three tools by what the token may do', async () => {
    const reader = await listMcpToolNames(baseUrl, await tokenWith([collectionsRead]));
    const writer = await listMcpToolNames(baseUrl, await tokenWith([collectionsRead, collectionsWrite]));
    const configurer = await listMcpToolNames(baseUrl, await tokenWith([collectionsRead, collectionsConfigure]));

    expect(reader).toContain('list_templates');
    expect(reader).not.toContain('save_template');
    expect(writer).not.toContain('save_template');
    expect(configurer).toContain('save_template');
    expect(configurer).toContain('delete_template');
  });

  it('says there are no templates before the first one', async () => {
    const answer = await call(await tokenWith([collectionsRead]), 'list_templates', { collection: collectionId });

    expect(listingShape.parse(answer.structuredContent).templates).toEqual([]);
    expect(readMcpText(answer)).toContain('no templates');
  });

  it('creates a template with values, variables and a default, and lists it', async () => {
    const secret = await tokenWith([collectionsRead, collectionsConfigure]);

    const answer = await call(secret, 'save_template', {
      collection: collectionId,
      isDefault: true,
      properties: { Estado: 'Hecho' },
      text: 'Pasos de la revisión.',
      title: 'Revisión semanal',
      variables: { Vence: '@today', Responsable: '@me' },
    });

    expect(answer.isError).toBeUndefined();
    const saved = templateShape.parse(answer.structuredContent);
    expect(saved.isDefault).toBe(true);
    expect(saved.variables.map((variable) => `${variable.column}=${variable.word}`).sort()).toEqual([
      'Responsable=@me',
      'Vence=@today',
    ]);
    expect((await listing(secret)).defaultTemplateId).toBe(saved.id);
  });

  it('refuses a variable that does not fit its column and a new template without a title', async () => {
    const secret = await tokenWith([collectionsRead, collectionsConfigure]);

    const wrongWord = await call(secret, 'save_template', {
      collection: collectionId,
      title: 'Mal',
      variables: { Estado: '@today' },
    });
    const noTitle = await call(secret, 'save_template', { collection: collectionId, text: 'Sin nombre' });

    expect(wrongWord.isError).toBe(true);
    expect(readMcpText(wrongWord)).toContain('does not fit');
    expect(noTitle.isError).toBe(true);
    expect(readMcpText(noTitle)).toContain('title');
  });

  it('makes a row from the default template when none is named, and fills today and the creator', async () => {
    const secret = await tokenWith([collectionsRead, collectionsWrite]);

    const answer = await call(secret, 'create_row', {
      collection: collectionId,
      timeZone: 'UTC',
      title: 'Revisar caja',
    });

    expect(answer.isError).toBeUndefined();
    const stored = await readStoredPage(testApp, ownerToken, rowShape.parse(answer.structuredContent).id);
    expect(stored.title).toBe('Revisar caja');
    expect(stored.propertyValues).toEqual({
      due: { start: new Date().toISOString().slice(0, 10) },
      owner: [ownerId],
      status: doneId,
    });
    expect(JSON.stringify(stored.content)).toContain('Pasos de la revisión.');
  });

  it('starts blank with template null, and lets given values and text win', async () => {
    const secret = await tokenWith([collectionsRead, collectionsWrite]);

    const blank = await call(secret, 'create_row', { collection: collectionId, template: null, title: 'En blanco' });
    const given = await call(secret, 'create_row', {
      collection: collectionId,
      properties: { Estado: 'Por hacer' },
      template: 'revision semanal',
      text: 'Mi texto.',
      title: 'Con lo mío',
    });

    const blankRow = await readStoredPage(testApp, ownerToken, rowShape.parse(blank.structuredContent).id);
    const givenRow = await readStoredPage(testApp, ownerToken, rowShape.parse(given.structuredContent).id);
    expect(blankRow.propertyValues?.owner).toBeUndefined();
    expect(JSON.stringify(blankRow.content)).not.toContain('Pasos de la revisión.');
    expect(givenRow.propertyValues?.status).not.toBe(doneId);
    expect(givenRow.propertyValues?.owner).toEqual([ownerId]);
    expect(JSON.stringify(givenRow.content)).toContain('Mi texto.');
    expect(JSON.stringify(givenRow.content)).not.toContain('Pasos de la revisión.');
  });

  it('refuses a template that does not exist and lists the ones that do', async () => {
    const secret = await tokenWith([collectionsRead, collectionsWrite]);

    const answer = await call(secret, 'create_row', { collection: collectionId, template: 'Inexistente', title: 'x' });

    expect(answer.isError).toBe(true);
    expect(readMcpText(answer)).toContain('Revisión semanal');
  });

  it('updates a template by name: renames it and replaces its values', async () => {
    const secret = await tokenWith([collectionsRead, collectionsConfigure]);

    const answer = await call(secret, 'save_template', {
      collection: collectionId,
      properties: { Estado: 'Por hacer' },
      template: 'Revisión semanal',
      title: 'Revisión del lunes',
    });

    expect(answer.isError).toBeUndefined();
    const titles = (await listing(secret)).templates.map((template) => template.title);
    expect(titles).toContain('Revisión del lunes');
    expect(titles).not.toContain('Revisión semanal');
  });

  it('never returns a template as a row of the collection', async () => {
    const secret = await tokenWith([collectionsRead]);

    const answer = await call(secret, 'query_collection', { collection: collectionId, limit: 50 });

    const queried = queriedShape.parse(answer.structuredContent);
    expect(queried.rows.map((row) => row.title)).not.toContain('Revisión del lunes');
    expect(queried.total).toBe(queried.rows.length);
  });

  it('deletes a template, and the default goes with it', async () => {
    const secret = await tokenWith([collectionsRead, collectionsConfigure]);

    const answer = await call(secret, 'delete_template', { collection: collectionId, template: 'Revisión del lunes' });

    expect(answer.isError).toBeUndefined();
    const after = await listing(secret);
    expect(after.templates).toEqual([]);
    expect(after.defaultTemplateId).toBeNull();
    const trash = await call(await tokenWith([pagesRead]), 'list_trash', { space: spaceId });
    const trashed = z
      .object({ pages: z.array(z.object({ id: z.string(), isTemplate: z.boolean(), title: z.string() })) })
      .parse(trash.structuredContent)
      .pages.find((entry) => entry.title === 'Revisión del lunes');
    expect(trashed?.isTemplate).toBe(true);
    const restored = await call(await tokenWith([pagesRead, pagesTrash]), 'restore_page', { page: trashed?.id });
    expect(restored.isError).toBeUndefined();
    expect((await listing(secret)).templates.map((template) => template.title)).toContain('Revisión del lunes');
  });
});
