import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import type { PageContent } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SpaceResponse {
  id: string;
}

interface PageResponse {
  id: string;
}

interface SettingsResponse {
  enabled: boolean;
}

interface UsageSummaryResponse {
  viewCount: number;
  viewers: Array<{ id: string; name: string; viewedAt: string }>;
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

const createPage = async (testApp: TestApp, token: string, spaceId: string, title: string): Promise<string> => {
  const response = await request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: plainContent(title), title })
    .expect(201);
  return (response.body as PageResponse).id;
};

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
  let adminToken: string;
  let adminEmail: string;
  let workerToken: string;
  let spaceId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    adminEmail = `page-views-admin-${String(timestamp)}@test.com`;
    const workerEmail = `page-views-worker-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await createAccount(testApp, { email: adminEmail, name: 'Views Admin', password });
    await createAccount(testApp, { email: workerEmail, name: 'Views Worker', password });
    await promoteToAdmin(testApp, adminEmail);

    adminToken = (await loginUser(testApp, adminEmail, password)).accessToken;
    workerToken = (await loginUser(testApp, workerEmail, password)).accessToken;

    spaceId = await createSpace(testApp, adminToken, 'Views Space', `views-space-${String(timestamp)}`);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('counts a view and reports who viewed the page, for an admin only', async () => {
    const pageId = await createPage(testApp, adminToken, spaceId, 'Tracked Page');

    await recordView(testApp, workerToken, pageId).expect(201);

    const summary = await getUsageSummary(testApp, adminToken, pageId).expect(200);
    const body = summary.body as UsageSummaryResponse;
    expect(body.viewCount).toBe(1);
    expect(body.viewers.map((viewer) => viewer.name)).toEqual(['Views Worker']);

    await getUsageSummary(testApp, workerToken, pageId).expect(403);
  });

  it('does not count a second view from the same reader inside the cooldown window', async () => {
    const pageId = await createPage(testApp, adminToken, spaceId, 'Repeated Read Page');

    await recordView(testApp, workerToken, pageId).expect(201);
    await recordView(testApp, workerToken, pageId).expect(201);

    const summary = await getUsageSummary(testApp, adminToken, pageId).expect(200);
    expect((summary.body as UsageSummaryResponse).viewCount).toBe(1);
  });

  it('lets an admin turn tracking off, and no view is stored while it is off', async () => {
    const pageId = await createPage(testApp, adminToken, spaceId, 'Toggle Page');

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
