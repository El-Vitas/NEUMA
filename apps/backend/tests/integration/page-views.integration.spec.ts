import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import {
  createSeededSpace,
  createSeededUser,
  onlyUserPermissions,
  type SeededUser,
} from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SettingsResponse {
  enabled: boolean;
}

interface UsageSummaryResponse {
  viewCount: number;
  viewers: Array<{ id: string; name: string; viewedAt: string }>;
}

const recordView = (testApp: TestApp, token: string, pageId: string) =>
  request(testApp.getServer()).post(`/api/v1/page-views/pages/${pageId}`).set('Authorization', `Bearer ${token}`);

const getUsageSummary = (testApp: TestApp, token: string, pageId: string) =>
  request(testApp.getServer()).get(`/api/v1/page-views/pages/${pageId}`).set('Authorization', `Bearer ${token}`);

const getSettings = (testApp: TestApp, token: string) =>
  request(testApp.getServer()).get('/api/v1/page-views/settings').set('Authorization', `Bearer ${token}`);

const updateSettings = (testApp: TestApp, token: string, enabled: boolean) =>
  request(testApp.getServer())
    .patch('/api/v1/page-views/settings')
    .set('Authorization', `Bearer ${token}`)
    .send({ enabled });

describe('Page Views (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: SeededUser;
  let worker: SeededUser;
  let adminToken: string;
  let workerToken: string;
  let spaceId: string;

  const createPage = async (
    title: string,
    overrides: { lifecycle?: 'ACTIVE' | 'TRASHED'; permissions?: ReturnType<typeof onlyUserPermissions> } = {},
  ): Promise<string> => {
    const page = await createBlockFactory(prisma.models).create({
      createdById: admin.id,
      editedById: admin.id,
      spaceId,
      title,
      type: 'page',
      ...overrides,
    });
    return page.id;
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'Views Admin', 'ADMIN');
    worker = await createSeededUser(testApp, 'Views Worker', 'WORKER');
    adminToken = admin.token;
    workerToken = worker.token;
    spaceId = await createSeededSpace(testApp, adminToken, SpaceVisibility.PUBLIC_INTERNAL);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('counts a view and reports who viewed the page, for an admin only', async () => {
    const pageId = await createPage('Tracked Page');

    await recordView(testApp, workerToken, pageId).expect(201);

    const summary = await getUsageSummary(testApp, adminToken, pageId).expect(200);
    const body = summary.body as UsageSummaryResponse;
    expect(body.viewCount).toBe(1);
    expect(body.viewers.map((viewer) => viewer.name)).toEqual(['Views Worker']);

    await getUsageSummary(testApp, workerToken, pageId).expect(403);
  });

  it('records no view of a page the reader can no longer read, and hides its summary', async () => {
    const hiddenPageId = await createPage('Hidden Page', { permissions: onlyUserPermissions(admin.id) });
    const trashedPageId = await createPage('Trashed Page', { lifecycle: 'TRASHED' });

    await recordView(testApp, workerToken, hiddenPageId).expect(201);
    await recordView(testApp, workerToken, trashedPageId).expect(201);

    expect(await prisma.models.PageView.where({ pageId: hiddenPageId }).all()).toHaveLength(0);
    expect(await prisma.models.PageView.where({ pageId: trashedPageId }).all()).toHaveLength(0);
    await getUsageSummary(testApp, adminToken, hiddenPageId).expect(200);
    await getUsageSummary(testApp, adminToken, trashedPageId).expect(403);
  });

  it('stops reporting a page once it becomes hidden to the reader of the summary', async () => {
    const pageId = await createPage('Hidden Later Page');
    await recordView(testApp, workerToken, pageId).expect(201);
    await prisma.models.Block.where({ id: pageId }).update({ lifecycle: 'TRASHED' });

    await getUsageSummary(testApp, adminToken, pageId).expect(403);
  });

  it('does not count a second view from the same reader inside the cooldown window', async () => {
    const pageId = await createPage('Repeated Read Page');

    await recordView(testApp, workerToken, pageId).expect(201);
    await recordView(testApp, workerToken, pageId).expect(201);

    const summary = await getUsageSummary(testApp, adminToken, pageId).expect(200);
    expect((summary.body as UsageSummaryResponse).viewCount).toBe(1);
  });

  it('lets an admin turn tracking off, and no view is stored while it is off', async () => {
    const pageId = await createPage('Toggle Page');

    await updateSettings(testApp, adminToken, false).expect(200);
    await recordView(testApp, workerToken, pageId).expect(201);

    const summary = await getUsageSummary(testApp, adminToken, pageId).expect(200);
    expect((summary.body as UsageSummaryResponse).viewCount).toBe(0);

    await updateSettings(testApp, adminToken, true).expect(200);
  });

  it('refuses a non-admin who tries to change the tracking setting', async () => {
    await updateSettings(testApp, workerToken, false).expect(403);
  });

  it('refuses a non-admin who tries to read the tracking setting', async () => {
    await getSettings(testApp, workerToken).expect(403);
  });

  it('lets an admin read the tracking setting', async () => {
    const response = await getSettings(testApp, adminToken).expect(200);
    expect((response.body as SettingsResponse).enabled).toBe(true);
  });
});
