import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import type { PageContent } from '@company-brain/shared';
import request from 'supertest';
import { CollaborationGateway } from '@/modules/collaboration/collaboration.service';
import { readCollaborationDocumentContent } from '@/modules/collaboration/utils/collaboration.document.utils';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

const paragraph = (id: string, text: string): PageContent['content'][number] => ({
  attrs: { id },
  content: [{ text, type: 'text' }],
  type: 'paragraph',
});

const pageOf = (...blocks: PageContent['content']): PageContent => ({ content: blocks, schemaVersion: 1, type: 'doc' });

const textBeyondThePageLimit = 20_001;

describe('Writing the content of a page through its live document (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let clientToken: string;
  let adminId: string;
  let spaceId: string;
  let workspaceId: string;

  const createPage = async (content: PageContent): Promise<string> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content, title: 'Contenido' })
      .expect(201);
    return (response.body as IdResponse).id;
  };

  const replaceContent = (pageId: string, content: unknown, token = adminToken) =>
    request(testApp.getServer())
      .put(`/api/v1/spaces/${spaceId}/pages/${pageId}/content`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content });

  const appendBlocks = (pageId: string, blocks: unknown, token = adminToken) =>
    request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ blocks });

  const readStored = async (pageId: string): Promise<{ content: unknown; versions: number }> => {
    const prisma = testApp.get(PrismaService);
    const page = await prisma.page.findUniqueOrThrow({ select: { content: true }, where: { id: pageId } });
    const versions = await prisma.pageVersion.count({ where: { pageId } });
    return { content: page.content, versions };
  };

  const readLive = async (pageId: string): Promise<PageContent> => {
    const gateway = testApp.get(CollaborationGateway);
    const connection = await gateway.server.openDirectConnection(`page:${pageId}`, {
      mode: 'write',
      pageId,
      role: 'ADMIN',
      userId: adminId,
      workspaceId,
    });
    const document = connection.document;
    if (document === null) throw new Error('the live document went away');
    const content = readCollaborationDocumentContent(document);
    await connection.disconnect();
    return content;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const timestamp = String(Date.now());
    const password = 'plainPassword123';
    const adminEmail = `content-admin-${timestamp}@test.com`;
    const clientEmail = `content-client-${timestamp}@test.com`;
    const prisma = testApp.get(PrismaService);

    await registerUser(testApp, { email: adminEmail, name: 'Content Admin', password });
    await registerUser(testApp, { email: clientEmail, name: 'Content Client', password });
    await prisma.user.update({ data: { role: 'ADMIN' }, where: { email: adminEmail } });
    await prisma.user.update({ data: { role: 'CLIENT' }, where: { email: clientEmail } });
    adminToken = (await loginUser(testApp, adminEmail, password)).accessToken;
    clientToken = (await loginUser(testApp, clientEmail, password)).accessToken;
    adminId = (await prisma.user.findUniqueOrThrow({ select: { id: true }, where: { email: adminEmail } })).id;

    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Content Space', slug: `content-space-${timestamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as IdResponse).id;
    workspaceId = (await prisma.space.findUniqueOrThrow({ select: { workspaceId: true }, where: { id: spaceId } }))
      .workspaceId;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('replaces the content, cuts one version, and the live document says the same', async () => {
    const pageId = await createPage(pageOf(paragraph('a', 'Antes')));
    const before = await readStored(pageId);

    await replaceContent(pageId, pageOf(paragraph('a', 'Después'))).expect(200);

    const after = await readStored(pageId);
    expect(after.content).toEqual(pageOf(paragraph('a', 'Después')));
    expect(after.versions).toBe(before.versions + 1);
    expect(await readLive(pageId)).toEqual(pageOf(paragraph('a', 'Después')));
  });

  it('cuts no version when the content did not change', async () => {
    const pageId = await createPage(pageOf(paragraph('a', 'Igual')));
    await replaceContent(pageId, pageOf(paragraph('a', 'Igual otra vez'))).expect(200);
    const once = await readStored(pageId);

    await replaceContent(pageId, pageOf(paragraph('a', 'Igual otra vez'))).expect(200);

    expect((await readStored(pageId)).versions).toBe(once.versions);
  });

  it('appends blocks after what the page already says', async () => {
    const pageId = await createPage(pageOf(paragraph('a', 'Primero')));

    const response = await appendBlocks(pageId, [paragraph('b', 'Agregado')]).expect(201);

    expect(response.body).toEqual(pageOf(paragraph('a', 'Primero'), paragraph('b', 'Agregado')));
    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph('a', 'Primero'), paragraph('b', 'Agregado')));
  });

  // Regression: reading the page, adding to it and saving it whole lost concurrent additions.
  it('keeps both of two appends that arrive at the same time', async () => {
    const pageId = await createPage(pageOf(paragraph('a', 'Base')));

    await Promise.all([
      appendBlocks(pageId, [paragraph('b', 'Uno')]).expect(201),
      appendBlocks(pageId, [paragraph('c', 'Otro')]).expect(201),
    ]);

    const stored = (await readStored(pageId)).content;
    expect(JSON.stringify(stored)).toContain('Uno');
    expect(JSON.stringify(stored)).toContain('Otro');
  });

  it('refuses content that does not fit a page, and leaves the page as it was', async () => {
    const pageId = await createPage(pageOf(paragraph('a', 'Intacta')));

    await replaceContent(pageId, pageOf(paragraph('a', 'x'.repeat(textBeyondThePageLimit)))).expect(400);
    await appendBlocks(pageId, [{ type: 'paragraph', content: 'not blocks' }]).expect(400);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph('a', 'Intacta')));
    expect(await readLive(pageId)).toEqual(pageOf(paragraph('a', 'Intacta')));
  });

  it('refuses to write for someone who may only read', async () => {
    const pageId = await createPage(pageOf(paragraph('a', 'Solo lectura')));

    await replaceContent(pageId, pageOf(paragraph('a', 'Cliente')), clientToken).expect(403);
    await appendBlocks(pageId, [paragraph('b', 'Cliente')], clientToken).expect(403);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph('a', 'Solo lectura')));
  });

  it('refuses to write in a locked page', async () => {
    const pageId = await createPage(pageOf(paragraph('a', 'Bloqueada')));
    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${pageId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ locked: true })
      .expect(200);

    await replaceContent(pageId, pageOf(paragraph('a', 'Cambio'))).expect(409);
    await appendBlocks(pageId, [paragraph('b', 'Cambio')]).expect(409);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph('a', 'Bloqueada')));
  });

  it('refuses to write in a page that is in the trash, as a refusal and not a failure', async () => {
    const pageId = await createPage(pageOf(paragraph('a', 'En la papelera')));
    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/trash`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-mutation-id', crypto.randomUUID())
      .expect(201);

    await replaceContent(pageId, pageOf(paragraph('a', 'Cambio'))).expect(409);
    await appendBlocks(pageId, [paragraph('b', 'Cambio')]).expect(409);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph('a', 'En la papelera')));
  });
});
