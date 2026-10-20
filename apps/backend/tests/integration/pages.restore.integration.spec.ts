import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import type { PageContent } from '@neuma/shared';
import request from 'supertest';
import { PAGE_PURGE_DELAY_DAYS } from '@/modules/pages/constants/pages.constants';
import { PagesService } from '@/modules/pages/pages.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

/** A moment past any deadline scheduled now, so the purge treats it as due. */
const afterThePurgeDelay = (): Date => new Date(Date.now() + (PAGE_PURGE_DELAY_DAYS + 1) * 24 * 60 * 60 * 1000);

interface SpaceResponse {
  id: string;
}

interface PageResponse {
  id: string;
  parentId: null | string;
  spaceId: string;
  title: string;
}

interface PageRestoreOutcomeResponse {
  parentTitle: null | string;
  restoredChildCount: number;
  restoredToRoot: boolean;
  spaceName: null | string;
}

const plainContent = (text: string): PageContent => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const promoteToAdmin = async (testApp: TestApp, email: string): Promise<void> => {
  const prisma = testApp.get(PrismaService);
  await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
};

const createSpace = async (testApp: TestApp, token: string, name: string, slug: string): Promise<string> => {
  const response = await request(testApp.getServer())
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, slug, visibility: SpaceVisibility.PUBLIC_INTERNAL })
    .expect(201);
  return (response.body as SpaceResponse).id;
};

const createPage = async (
  testApp: TestApp,
  token: string,
  spaceId: string,
  title: string,
  parentId?: string,
): Promise<PageResponse> => {
  const response = await request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: plainContent(title), parentId, title })
    .expect(201);
  return response.body as PageResponse;
};

const trashPage = (testApp: TestApp, token: string, spaceId: string, pageId: string) =>
  request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/trash`)
    .set('Authorization', `Bearer ${token}`)
    .set('x-mutation-id', crypto.randomUUID())
    .expect(201);

const deleteForever = (testApp: TestApp, token: string, spaceId: string, pageId: string) =>
  request(testApp.getServer())
    .delete(`/api/v1/spaces/${spaceId}/pages/${pageId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

const restorePage = async (
  testApp: TestApp,
  token: string,
  spaceId: string,
  pageId: string,
  includeChildren = false,
): Promise<PageRestoreOutcomeResponse> => {
  const response = await request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/restore`)
    .set('Authorization', `Bearer ${token}`)
    .set('x-mutation-id', crypto.randomUUID())
    .send({ includeChildren })
    .expect(201);
  return response.body as PageRestoreOutcomeResponse;
};

const getPage = async (testApp: TestApp, token: string, spaceId: string, pageId: string): Promise<PageResponse> => {
  const response = await request(testApp.getServer())
    .get(`/api/v1/spaces/${spaceId}/pages/${pageId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return response.body as PageResponse;
};

describe('Restoring a trashed page (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let spaceId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    const adminEmail = `restore-admin-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await createAccount(testApp, { email: adminEmail, name: 'Restore Admin', password });
    await promoteToAdmin(testApp, adminEmail);

    const adminSession = await loginUser(testApp, adminEmail, password);
    adminToken = adminSession.accessToken;

    spaceId = await createSpace(testApp, adminToken, 'Restore Space', `restore-space-${String(timestamp)}`);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('restores a page back under its parent when the parent is still active', async () => {
    const parent = await createPage(testApp, adminToken, spaceId, 'Living Parent');
    const child = await createPage(testApp, adminToken, spaceId, 'Child Of Living Parent', parent.id);
    await trashPage(testApp, adminToken, spaceId, child.id);

    const outcome = await restorePage(testApp, adminToken, spaceId, child.id);

    expect(outcome.restoredToRoot).toBe(false);
    expect(outcome.parentTitle).toBe('Living Parent');
    expect(outcome.spaceName).toBeNull();

    const restoredChild = await getPage(testApp, adminToken, spaceId, child.id);
    expect(restoredChild.parentId).toBe(parent.id);
  });

  it('restores a page to the root of its space when its parent stays trashed', async () => {
    const parent = await createPage(testApp, adminToken, spaceId, 'Still Trashed Parent');
    const child = await createPage(testApp, adminToken, spaceId, 'Child Of Trashed Parent', parent.id);
    await trashPage(testApp, adminToken, spaceId, child.id);
    await trashPage(testApp, adminToken, spaceId, parent.id);

    const outcome = await restorePage(testApp, adminToken, spaceId, child.id);

    expect(outcome.restoredToRoot).toBe(true);
    expect(outcome.parentTitle).toBeNull();
    expect(outcome.spaceName).toBe('Restore Space');

    const restoredChild = await getPage(testApp, adminToken, spaceId, child.id);
    expect(restoredChild.parentId).toBeNull();
  });

  /** A page block owns its subtree: deleting it for good deletes the pages below it too, so none is left to restore. */
  it('takes the pages below a page with it when the page is deleted forever', async () => {
    const parent = await createPage(testApp, adminToken, spaceId, 'Deleted Forever Parent');
    const child = await createPage(testApp, adminToken, spaceId, 'Child Of Deleted Parent', parent.id);
    await trashPage(testApp, adminToken, spaceId, parent.id);
    await deleteForever(testApp, adminToken, spaceId, parent.id);
    await testApp.get(PagesService).purgeDuePages(afterThePurgeDelay());

    const prisma = testApp.get(PrismaService);
    expect(await prisma.models.Block.first({ id: parent.id })).toBeNull();
    expect(await prisma.models.Block.first({ id: child.id })).toBeNull();
    await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages/${child.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-mutation-id', crypto.randomUUID())
      .send({ includeChildren: false })
      .expect(409);
  });

  it('carries no restore notice when the page had no parent to begin with', async () => {
    const topLevelPage = await createPage(testApp, adminToken, spaceId, 'Already At Root');
    await trashPage(testApp, adminToken, spaceId, topLevelPage.id);

    const outcome = await restorePage(testApp, adminToken, spaceId, topLevelPage.id);

    expect(outcome.restoredToRoot).toBe(false);
    expect(outcome.parentTitle).toBeNull();
    expect(outcome.spaceName).toBeNull();
  });

  it('still restores trashed descendants alongside their parent', async () => {
    const parent = await createPage(testApp, adminToken, spaceId, 'Cascade Parent');
    const child = await createPage(testApp, adminToken, spaceId, 'Cascade Child', parent.id);
    await trashPage(testApp, adminToken, spaceId, child.id);
    await trashPage(testApp, adminToken, spaceId, parent.id);

    const outcome = await restorePage(testApp, adminToken, spaceId, parent.id, true);

    expect(outcome.restoredChildCount).toBe(1);
    expect(outcome.restoredToRoot).toBe(false);

    const restoredChild = await getPage(testApp, adminToken, spaceId, child.id);
    expect(restoredChild.parentId).toBe(parent.id);
  });

  it('refuses to rename, lock, verify, copy or give an owner to a page in the trash, changing nothing', async () => {
    const trashed = await createPage(testApp, adminToken, spaceId, 'En la papelera');
    await trashPage(testApp, adminToken, spaceId, trashed.id);
    const path = `/api/v1/spaces/${spaceId}/pages/${trashed.id}`;
    const server = () => request(testApp.getServer());
    const asAdmin = { Authorization: `Bearer ${adminToken}`, 'x-mutation-id': crypto.randomUUID() };

    const statuses = await Promise.all([
      server().patch(`${path}/title`).set(asAdmin).send({ title: 'Renombrada' }),
      server().patch(`${path}/lock`).set(asAdmin).send({ locked: true }),
      server().patch(`${path}/verification`).set(asAdmin).send({ verified: true }),
      server().patch(`${path}/owner`).set(asAdmin).send({ ownerId: null }),
      server().post(`${path}/duplicate`).set(asAdmin).send({ includeChildren: false }),
    ]);

    for (const response of statuses) expect(response.status).toBeGreaterThanOrEqual(400);
    const blocks = testApp.get(PrismaService).models.Block;
    const stored = await blocks.where({ id: trashed.id }).select('lockedAt', 'text', 'verifiedAt').all().firstOrThrow();
    expect(stored).toEqual({ lockedAt: null, text: 'En la papelera', verifiedAt: null });
    const matching = await blocks
      .where({ type: 'page' })
      .where((block) => block.text.like('En la papelera%'))
      .aggregate((aggregate) => ({ total: aggregate.count() }));
    expect(matching.total).toBe(1);
  });

  it('refuses to create or move a page under one in the trash', async () => {
    const gone = await createPage(testApp, adminToken, spaceId, 'Padre en la papelera');
    const loose = await createPage(testApp, adminToken, spaceId, 'Suelta');
    await trashPage(testApp, adminToken, spaceId, gone.id);

    const created = await request(testApp.getServer())
      .post(`/api/v1/spaces/${spaceId}/pages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: plainContent('Hija'), parentId: gone.id, title: 'Hija' });
    const moved = await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${loose.id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-mutation-id', crypto.randomUUID())
      .send({ parentId: gone.id });

    expect(created.status).toBeGreaterThanOrEqual(400);
    expect(moved.status).toBeGreaterThanOrEqual(400);
    expect((await getPage(testApp, adminToken, spaceId, loose.id)).parentId).toBeNull();
  });

  it('empties the trash by scheduling, then purges after the delay, leaving a restored page untouched', async () => {
    const gone = await createPage(testApp, adminToken, spaceId, 'Se va');
    const kept = await createPage(testApp, adminToken, spaceId, 'Vuelve');
    await trashPage(testApp, adminToken, spaceId, gone.id);
    await trashPage(testApp, adminToken, spaceId, kept.id);
    await restorePage(testApp, adminToken, spaceId, kept.id);

    const emptied = await request(testApp.getServer())
      .delete('/api/v1/pages/trash')
      .query({ spaceId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((emptied.body as { scheduledCount: number }).scheduledCount).toBeGreaterThanOrEqual(1);
    const prisma = testApp.get(PrismaService);
    const scheduled = await prisma.models.Block.where({ id: gone.id }).select('purgeAfter').first();
    expect(scheduled?.purgeAfter).toBeInstanceOf(Date);

    await testApp.get(PagesService).purgeDuePages(new Date());
    expect(await prisma.models.Block.first({ id: gone.id })).not.toBeNull();

    await testApp.get(PagesService).purgeDuePages(afterThePurgeDelay());
    expect(await prisma.models.Block.first({ id: gone.id })).toBeNull();
    expect(await prisma.models.Block.where({ id: kept.id }).select('lifecycle').first()).toEqual({
      lifecycle: 'ACTIVE',
    });
    const record = await prisma.models.PagePurge.where({ pageId: gone.id })
      .select('purgedAt', 'requestedById', 'title')
      .first();
    expect(record?.title).toBe('Se va');
    expect(record?.purgedAt).toBeInstanceOf(Date);
  });

  it('cancels a scheduled deletion when the page comes back from the trash', async () => {
    const page = await createPage(testApp, adminToken, spaceId, 'Casi se va');
    await trashPage(testApp, adminToken, spaceId, page.id);
    await deleteForever(testApp, adminToken, spaceId, page.id);

    await restorePage(testApp, adminToken, spaceId, page.id);
    await testApp.get(PagesService).purgeDuePages(afterThePurgeDelay());

    const prisma = testApp.get(PrismaService);
    expect(await prisma.models.Block.where({ id: page.id }).select('lifecycle', 'purgeAfter').first()).toEqual({
      lifecycle: 'ACTIVE',
      purgeAfter: null,
    });
    const record = await prisma.models.PagePurge.where({ pageId: page.id }).select('cancelledAt', 'purgedAt').first();
    expect(record?.cancelledAt).toBeInstanceOf(Date);
    expect(record?.purgedAt).toBeNull();
  });

  it('refuses to delete forever for anyone but an administrator', async () => {
    const timestamp = String(Date.now());
    const workerEmail = `restore-worker-${timestamp}@test.com`;
    const password = 'plainPassword123';
    await createAccount(testApp, { email: workerEmail, name: 'Restore Worker', password });
    await testApp.get(PrismaService).models.User.where({ email: workerEmail }).update({ role: 'WORKER' });
    const workerToken = (await loginUser(testApp, workerEmail, password)).accessToken;
    const page = await createPage(testApp, adminToken, spaceId, 'Solo admin la borra');
    await trashPage(testApp, adminToken, spaceId, page.id);

    const response = await request(testApp.getServer())
      .delete(`/api/v1/spaces/${spaceId}/pages/${page.id}`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(response.status).toBe(403);
    const stored = await testApp.get(PrismaService).models.Block.where({ id: page.id }).select('purgeAfter').first();
    expect(stored).toEqual({ purgeAfter: null });
  });
});
