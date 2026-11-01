import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import type { PageContent } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface PageResponse {
  content: PageContent;
  id: string;
}

const paragraph = (id: string, text: string): PageContent['content'][number] => ({
  attrs: { id },
  content: [{ text, type: 'text' }],
  type: 'paragraph',
});

const pageOf = (...blocks: PageContent['content']): PageContent => ({ content: blocks, schemaVersion: 1, type: 'doc' });

/** A block id belongs to one block of the whole database, so every test writes with its own. */
const newIds = () => ({ a: crypto.randomUUID(), b: crypto.randomUUID(), c: crypto.randomUUID() });

const textBeyondThePageLimit = 20_001;

describe('Writing the content of a page (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let clientToken: string;
  let spaceId: string;

  const createPage = async (content: PageContent): Promise<string> => {
    const response = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content, title: 'Contenido' })
      .expect(201);
    return (response.body as PageResponse).id;
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

  const readStored = async (pageId: string): Promise<{ content: PageContent; versions: number }> => {
    const prisma = testApp.get(PrismaService);
    const page = await request(testApp.getServer())
      .get(`/api/v1/spaces/${spaceId}/pages/${pageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const stored = await prisma.models.PageVersion.where({ pageId }).aggregate((aggregate) => ({
      total: aggregate.count(),
    }));
    return { content: (page.body as PageResponse).content, versions: stored.total };
  };

  const readLatestVersion = async (pageId: string): Promise<{ content: unknown; version: number }> => {
    const latest = await testApp
      .get(PrismaService)
      .models.PageVersion.where({ pageId })
      .select('content', 'version')
      .orderBy((entry) => entry.version.desc())
      .first();
    if (latest === null) throw new Error('the page has no version');
    return { content: latest.content, version: latest.version };
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const timestamp = String(Date.now());
    const password = 'plainPassword123';
    const adminEmail = `content-admin-${timestamp}@test.com`;
    const clientEmail = `content-client-${timestamp}@test.com`;
    const prisma = testApp.get(PrismaService);

    await createAccount(testApp, { email: adminEmail, name: 'Content Admin', password });
    await createAccount(testApp, { email: clientEmail, name: 'Content Client', password });
    await prisma.models.User.where({ email: adminEmail }).update({ role: 'ADMIN' });
    await prisma.models.User.where({ email: clientEmail }).update({ role: 'CLIENT' });
    adminToken = (await loginUser(testApp, adminEmail, password)).accessToken;
    clientToken = (await loginUser(testApp, clientEmail, password)).accessToken;

    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Content Space', slug: `content-space-${timestamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    spaceId = (space.body as PageResponse).id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('replaces the content and keeps it in the history', async () => {
    const { a } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Antes')));
    const before = await readLatestVersion(pageId);

    await replaceContent(pageId, pageOf(paragraph(a, 'Después'))).expect(200);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph(a, 'Después')));
    const latest = await readLatestVersion(pageId);
    expect(latest.content).toEqual(pageOf(paragraph(a, 'Después')));
    expect(latest.version).toBeGreaterThan(before.version);
  });

  it('writes each block of the page as a block, and a block that stays is not written again', async () => {
    const { a, b } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Uno'), paragraph(b, 'Dos')));
    const prisma = testApp.get(PrismaService);
    const untouchedBefore = await prisma.models.Block.where({ id: a }).select('version').all().firstOrThrow();

    await replaceContent(pageId, pageOf(paragraph(a, 'Uno'), paragraph(b, 'Dos cambiado'))).expect(200);

    const untouchedAfter = await prisma.models.Block.where({ id: a }).select('version').all().firstOrThrow();
    const changed = await prisma.models.Block.where({ id: b }).select('text').all().firstOrThrow();
    expect(untouchedAfter.version).toBe(untouchedBefore.version);
    expect(changed.text).toBe('Dos cambiado');
  });

  it('folds saves by the same person within minutes into one history entry', async () => {
    const { a } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Uno')));
    const before = await readStored(pageId);

    await replaceContent(pageId, pageOf(paragraph(a, 'Dos'))).expect(200);
    await replaceContent(pageId, pageOf(paragraph(a, 'Tres'))).expect(200);

    expect((await readStored(pageId)).versions).toBe(before.versions);
    expect((await readLatestVersion(pageId)).content).toEqual(pageOf(paragraph(a, 'Tres')));
  });

  it('cuts no version when the content did not change', async () => {
    const { a } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Igual')));
    await replaceContent(pageId, pageOf(paragraph(a, 'Igual otra vez'))).expect(200);
    const once = await readStored(pageId);

    await replaceContent(pageId, pageOf(paragraph(a, 'Igual otra vez'))).expect(200);

    expect((await readStored(pageId)).versions).toBe(once.versions);
  });

  it('appends blocks after what the page already says', async () => {
    const { a, b } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Primero')));

    const response = await appendBlocks(pageId, [paragraph(b, 'Agregado')]).expect(201);

    expect(response.body).toEqual(pageOf(paragraph(a, 'Primero'), paragraph(b, 'Agregado')));
    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph(a, 'Primero'), paragraph(b, 'Agregado')));
  });

  it('gives an id to an appended block that has none', async () => {
    const { a } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Primero')));

    await appendBlocks(pageId, [{ content: [{ text: 'Sin id', type: 'text' }], type: 'paragraph' }]).expect(201);

    const stored = (await readStored(pageId)).content;
    expect(stored.content).toHaveLength(2);
    expect(JSON.stringify(stored.content.at(1))).toContain('"id"');
  });

  // Regression: reading the page, adding to it and saving it whole lost concurrent additions.
  it('keeps both of two appends that arrive at the same time', async () => {
    const { a, b, c } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Base')));

    await Promise.all([
      appendBlocks(pageId, [paragraph(b, 'Uno')]).expect(201),
      appendBlocks(pageId, [paragraph(c, 'Otro')]).expect(201),
    ]);

    const stored = (await readStored(pageId)).content;
    expect(JSON.stringify(stored)).toContain('Uno');
    expect(JSON.stringify(stored)).toContain('Otro');
  });

  it('brings back a removed block that a later document names again', async () => {
    const { a, b } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Uno'), paragraph(b, 'Dos')));
    await replaceContent(pageId, pageOf(paragraph(a, 'Uno'))).expect(200);

    await replaceContent(pageId, pageOf(paragraph(a, 'Uno'), paragraph(b, 'Dos'))).expect(200);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph(a, 'Uno'), paragraph(b, 'Dos')));
  });

  it('refuses content that does not fit a page, and leaves the page as it was', async () => {
    const { a } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Intacta')));

    await replaceContent(pageId, pageOf(paragraph(a, 'x'.repeat(textBeyondThePageLimit)))).expect(400);
    await appendBlocks(pageId, [{ type: 'paragraph', content: 'not blocks' }]).expect(400);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph(a, 'Intacta')));
  });

  it('refuses to write for someone who may only read', async () => {
    const { a, b } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Solo lectura')));

    await replaceContent(pageId, pageOf(paragraph(a, 'Cliente')), clientToken).expect(403);
    await appendBlocks(pageId, [paragraph(b, 'Cliente')], clientToken).expect(403);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph(a, 'Solo lectura')));
  });

  it('refuses to write in a locked page', async () => {
    const { a, b } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'Bloqueada')));
    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${pageId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ locked: true })
      .expect(200);

    await replaceContent(pageId, pageOf(paragraph(a, 'Cambio'))).expect(409);
    await appendBlocks(pageId, [paragraph(b, 'Cambio')]).expect(409);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph(a, 'Bloqueada')));
  });

  it('refuses to write in a page that is in the trash, as a refusal and not a failure', async () => {
    const { a, b } = newIds();
    const pageId = await createPage(pageOf(paragraph(a, 'En la papelera')));
    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/trash`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-mutation-id', crypto.randomUUID())
      .expect(201);

    await replaceContent(pageId, pageOf(paragraph(a, 'Cambio'))).expect(409);
    await appendBlocks(pageId, [paragraph(b, 'Cambio')]).expect(409);

    expect((await readStored(pageId)).content).toEqual(pageOf(paragraph(a, 'En la papelera')));
  });
});
