import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import type { PageContent } from '@company-brain/shared';
import request from 'supertest';
import { OUTBOX_MAX_CLAIM_BATCH_SIZE } from '@/common/constants/outbox.constants';
import { LinksProjectionWorker } from '@/modules/links/infrastructure/worker/links.projection.worker';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SpaceResponse {
  id: string;
}

interface PageResponse {
  id: string;
}

interface BacklinkItemResponse {
  id: string;
}

interface BacklinksResponse {
  count: number;
  items: BacklinkItemResponse[];
}

const MAX_PROJECTION_DRAIN_BATCHES = 20;

const drainLinksOutbox = async (linksProjectionWorker: LinksProjectionWorker): Promise<void> => {
  for (let batchCount = 0; batchCount < MAX_PROJECTION_DRAIN_BATCHES; batchCount += 1) {
    const processedCount = await linksProjectionWorker.processBatch(OUTBOX_MAX_CLAIM_BATCH_SIZE);
    if (processedCount === 0) return;
  }
  throw new Error(`Outbox did not drain within ${String(MAX_PROJECTION_DRAIN_BATCHES)} batches`);
};

const promoteToAdmin = async (testApp: TestApp, email: string): Promise<void> => {
  const prisma = testApp.get(PrismaService);
  await prisma.user.update({ data: { role: 'ADMIN' }, where: { email } });
};

const createSpace = async (
  testApp: TestApp,
  token: string,
  name: string,
  slug: string,
  visibility: SpaceVisibility,
): Promise<string> => {
  const response = await request(testApp.getServer())
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, slug, visibility })
    .expect(201);
  return (response.body as SpaceResponse).id;
};

const plainContent = (text: string): PageContent => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const mentioningContent = (spaceId: string, ...targetPageIds: readonly string[]): PageContent => ({
  content: targetPageIds.map((targetPageId) => ({
    content: [{ attrs: { label: targetPageId, pageId: targetPageId, spaceId }, type: 'mention' as const }],
    type: 'paragraph' as const,
  })),
  schemaVersion: 1,
  type: 'doc',
});

const createPage = async (
  testApp: TestApp,
  token: string,
  spaceId: string,
  title: string,
  content: PageContent,
): Promise<string> => {
  const response = await request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content, title })
    .expect(201);
  return (response.body as PageResponse).id;
};

const updatePageContent = async (
  testApp: TestApp,
  token: string,
  spaceId: string,
  pageId: string,
  title: string,
  content: PageContent,
): Promise<void> => {
  await request(testApp.getServer())
    .patch(`/api/v1/spaces/${spaceId}/pages/${pageId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content, title })
    .expect(200);
};

const setLifecycle = async (
  testApp: TestApp,
  token: string,
  spaceId: string,
  pageId: string,
  action: 'restore' | 'trash',
): Promise<void> => {
  await request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages/${pageId}/${action}`)
    .set('Authorization', `Bearer ${token}`)
    .set('x-mutation-id', `${action}-${pageId}-${String(Date.now())}`)
    .expect(201);
};

const getBacklinks = (testApp: TestApp, token: string, pageId: string) =>
  request(testApp.getServer()).get(`/api/v1/pages/${pageId}/backlinks`).set('Authorization', `Bearer ${token}`);

const findPageLink = async (testApp: TestApp, sourcePageId: string, targetPageId: string) => {
  const prisma = testApp.get(PrismaService);
  return prisma.pageLink.findUnique({ where: { sourcePageId_targetPageId: { sourcePageId, targetPageId } } });
};

describe('Page Links (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let outsiderToken: string;
  let sharedSpaceId: string;
  let secretSpaceId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    const adminEmail = `links-admin-${String(timestamp)}@test.com`;
    const outsiderEmail = `links-outsider-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await registerUser(testApp, { email: adminEmail, name: 'Links Admin', password });
    await registerUser(testApp, { email: outsiderEmail, name: 'Links Outsider', password });
    await promoteToAdmin(testApp, adminEmail);

    const adminSession = await loginUser(testApp, adminEmail, password);
    const outsiderSession = await loginUser(testApp, outsiderEmail, password);
    adminToken = adminSession.accessToken;
    outsiderToken = outsiderSession.accessToken;

    sharedSpaceId = await createSpace(
      testApp,
      adminToken,
      'Shared Links Space',
      `shared-links-${String(timestamp)}`,
      SpaceVisibility.PUBLIC_INTERNAL,
    );
    secretSpaceId = await createSpace(
      testApp,
      adminToken,
      'Secret Links Space',
      `secret-links-${String(timestamp)}`,
      SpaceVisibility.RESTRICTED,
    );
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('reconciliation', () => {
    it('creates exactly one row when a page mentions another page', async () => {
      const targetId = await createPage(testApp, adminToken, sharedSpaceId, 'Recon Target', plainContent('target'));
      const sourceId = await createPage(
        testApp,
        adminToken,
        sharedSpaceId,
        'Recon Source',
        mentioningContent(sharedSpaceId, targetId),
      );

      await drainLinksOutbox(testApp.get(LinksProjectionWorker));

      expect(await findPageLink(testApp, sourceId, targetId)).not.toBeNull();
    });

    it('deletes the row once the mention is removed, and is a no-op when re-saved unchanged', async () => {
      const targetId = await createPage(testApp, adminToken, sharedSpaceId, 'Recon Target 2', plainContent('target'));
      const sourceId = await createPage(
        testApp,
        adminToken,
        sharedSpaceId,
        'Recon Source 2',
        mentioningContent(sharedSpaceId, targetId),
      );
      await drainLinksOutbox(testApp.get(LinksProjectionWorker));
      expect(await findPageLink(testApp, sourceId, targetId)).not.toBeNull();

      await updatePageContent(
        testApp,
        adminToken,
        sharedSpaceId,
        sourceId,
        'Recon Source 2',
        plainContent('no more links'),
      );
      await drainLinksOutbox(testApp.get(LinksProjectionWorker));
      expect(await findPageLink(testApp, sourceId, targetId)).toBeNull();

      await updatePageContent(
        testApp,
        adminToken,
        sharedSpaceId,
        sourceId,
        'Recon Source 2',
        plainContent('no more links'),
      );
      await drainLinksOutbox(testApp.get(LinksProjectionWorker));
      expect(await findPageLink(testApp, sourceId, targetId)).toBeNull();
    });

    it('yields exactly one row when a page mentions the same target twice', async () => {
      const targetId = await createPage(testApp, adminToken, sharedSpaceId, 'Recon Target 3', plainContent('target'));
      const sourceId = await createPage(
        testApp,
        adminToken,
        sharedSpaceId,
        'Recon Source 3',
        mentioningContent(sharedSpaceId, targetId, targetId),
      );

      await drainLinksOutbox(testApp.get(LinksProjectionWorker));

      const prisma = testApp.get(PrismaService);
      const rows = await prisma.pageLink.findMany({ where: { sourcePageId: sourceId } });
      expect(rows).toHaveLength(1);
    });

    it('creates no row when a page mentions itself', async () => {
      const sourceId = await createPage(
        testApp,
        adminToken,
        sharedSpaceId,
        'Recon Self Reference',
        plainContent('placeholder'),
      );
      await updatePageContent(
        testApp,
        adminToken,
        sharedSpaceId,
        sourceId,
        'Recon Self Reference',
        mentioningContent(sharedSpaceId, sourceId),
      );

      await drainLinksOutbox(testApp.get(LinksProjectionWorker));

      expect(await findPageLink(testApp, sourceId, sourceId)).toBeNull();
    });
  });

  describe('authorization', () => {
    it('hides a backlink from a space the reader cannot access, from both the list and the count', async () => {
      const targetId = await createPage(testApp, adminToken, sharedSpaceId, 'Auth Target', plainContent('target'));
      const visibleSourceId = await createPage(
        testApp,
        adminToken,
        sharedSpaceId,
        'Auth Visible Source',
        mentioningContent(sharedSpaceId, targetId),
      );
      const hiddenSourceId = await createPage(
        testApp,
        adminToken,
        secretSpaceId,
        'Auth Hidden Source',
        mentioningContent(sharedSpaceId, targetId),
      );

      await drainLinksOutbox(testApp.get(LinksProjectionWorker));

      const asOutsider = await getBacklinks(testApp, outsiderToken, targetId).expect(200);
      const outsiderResult = asOutsider.body as BacklinksResponse;
      expect(outsiderResult.items.map((item) => item.id)).toEqual([visibleSourceId]);
      expect(outsiderResult.count).toBe(1);

      const asAdmin = await getBacklinks(testApp, adminToken, targetId).expect(200);
      const adminResult = asAdmin.body as BacklinksResponse;
      expect(adminResult.items.map((item) => item.id).sort()).toEqual([hiddenSourceId, visibleSourceId].sort());
      expect(adminResult.count).toBe(2);
    });
  });

  describe('lifecycle', () => {
    it('removes outgoing links when the source page is trashed', async () => {
      const targetId = await createPage(testApp, adminToken, sharedSpaceId, 'Lifecycle Target', plainContent('t'));
      const sourceId = await createPage(
        testApp,
        adminToken,
        sharedSpaceId,
        'Lifecycle Source',
        mentioningContent(sharedSpaceId, targetId),
      );
      await drainLinksOutbox(testApp.get(LinksProjectionWorker));
      expect(await findPageLink(testApp, sourceId, targetId)).not.toBeNull();

      await setLifecycle(testApp, adminToken, sharedSpaceId, sourceId, 'trash');
      await drainLinksOutbox(testApp.get(LinksProjectionWorker));

      expect(await findPageLink(testApp, sourceId, targetId)).toBeNull();
    });

    it('keeps incoming links intact while the target is trashed, excludes them from reads, and restores them', async () => {
      const targetId = await createPage(testApp, adminToken, sharedSpaceId, 'Lifecycle Target 2', plainContent('t'));
      const sourceId = await createPage(
        testApp,
        adminToken,
        sharedSpaceId,
        'Lifecycle Source 2',
        mentioningContent(sharedSpaceId, targetId),
      );
      await drainLinksOutbox(testApp.get(LinksProjectionWorker));
      const beforeTrash = await getBacklinks(testApp, adminToken, targetId).expect(200);
      expect((beforeTrash.body as BacklinksResponse).count).toBe(1);

      await setLifecycle(testApp, adminToken, sharedSpaceId, targetId, 'trash');
      await drainLinksOutbox(testApp.get(LinksProjectionWorker));

      expect(await findPageLink(testApp, sourceId, targetId)).not.toBeNull();
      const duringTrash = await getBacklinks(testApp, adminToken, targetId).expect(200);
      const duringTrashResult = duringTrash.body as BacklinksResponse;
      expect(duringTrashResult.items).toEqual([]);
      expect(duringTrashResult.count).toBe(0);

      await setLifecycle(testApp, adminToken, sharedSpaceId, targetId, 'restore');
      const afterRestore = await getBacklinks(testApp, adminToken, targetId).expect(200);
      const afterRestoreResult = afterRestore.body as BacklinksResponse;
      expect(afterRestoreResult.items.map((item) => item.id)).toEqual([sourceId]);
      expect(afterRestoreResult.count).toBe(1);
    });
  });
});
