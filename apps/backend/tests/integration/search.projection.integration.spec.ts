import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import type { PageContent } from '@company-brain/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { drainSearchProjection } from '../helpers/search.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SearchResponseItem {
  icon: { kind: string; value?: string } | null;
  parentPageId: string | null;
  parentPageTitle: string | null;
  sourceId: string;
  spaceName: string | null;
  title: string;
}

interface SearchResponse {
  items: SearchResponseItem[];
}

interface SpaceResponse {
  id: string;
}

interface PageResponse {
  id: string;
}

const promoteToAdmin = async (testApp: TestApp, email: string): Promise<void> => {
  const prisma = testApp.get(PrismaService);
  await prisma.user.update({ data: { role: 'ADMIN' }, where: { email } });
};

const searchAs = async (testApp: TestApp, token: string, query: string): Promise<SearchResponse> => {
  const response = await request(testApp.getServer())
    .get('/api/v1/search')
    .query({ query })
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return response.body as SearchResponse;
};

describe('Search Projection (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let outsiderToken: string;
  let searchTerm: string;
  let pageId: string;
  let spaceId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    const adminEmail = `search-admin-${String(timestamp)}@test.com`;
    const outsiderEmail = `search-outsider-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';
    searchTerm = `Zephyrine${String(timestamp)}`;

    await registerUser(testApp, { email: adminEmail, name: 'Search Admin', password });
    await registerUser(testApp, { email: outsiderEmail, name: 'Search Outsider', password });
    await promoteToAdmin(testApp, adminEmail);

    const adminSession = await loginUser(testApp, adminEmail, password);
    const outsiderSession = await loginUser(testApp, outsiderEmail, password);
    adminToken = adminSession.accessToken;
    outsiderToken = outsiderSession.accessToken;

    const spaceResponse = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Restricted Search Space',
        slug: `restricted-search-${String(timestamp)}`,
        visibility: SpaceVisibility.RESTRICTED,
      })
      .expect(201);
    const space = spaceResponse.body as SpaceResponse;
    spaceId = space.id;

    const content: PageContent = {
      content: [{ content: [{ text: searchTerm, type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    };
    const pageResponse = await request(testApp.getServer())
      .post(`/api/v1/spaces/${space.id}/pages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content, title: searchTerm })
      .expect(201);
    const page = pageResponse.body as PageResponse;
    pageId = page.id;

    await drainSearchProjection(testApp);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('makes a projected outbox event findable through the FTS query path', async () => {
    const response = await searchAs(testApp, adminToken, searchTerm);

    expect(response.items.some((item) => item.sourceId === pageId)).toBe(true);
  });

  it('honours space permission checks and hides the page from a non-member, non-admin user', async () => {
    const response = await searchAs(testApp, outsiderToken, searchTerm);

    expect(response.items.some((item) => item.sourceId === pageId)).toBe(false);
  });

  it('projects the space name and no parent page for a page created at the space root', async () => {
    const response = await searchAs(testApp, adminToken, searchTerm);

    const projectedPage = response.items.find((item) => item.sourceId === pageId);

    expect(projectedPage?.spaceName).toBe('Restricted Search Space');
    expect(projectedPage?.parentPageId).toBeNull();
    expect(projectedPage?.parentPageTitle).toBeNull();
  });

  it('learns the mark a page takes on after it was already indexed', async () => {
    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${pageId}/icon`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ icon: { kind: 'emoji', value: '🛰️' } })
      .expect(200);

    await drainSearchProjection(testApp);

    const response = await searchAs(testApp, adminToken, searchTerm);
    const projectedPage = response.items.find((item) => item.sourceId === pageId);

    expect(projectedPage?.icon).toEqual({ kind: 'emoji', value: '🛰️' });
  });

  it('learns the name a page takes on after it was already indexed', async () => {
    const renamedTitle = `${searchTerm} renombrada`;
    await request(testApp.getServer())
      .patch(`/api/v1/spaces/${spaceId}/pages/${pageId}/title`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: renamedTitle })
      .expect(200);

    await drainSearchProjection(testApp);

    const response = await searchAs(testApp, adminToken, searchTerm);
    const projectedPage = response.items.find((item) => item.sourceId === pageId);

    expect(projectedPage?.title).toBe(renamedTitle);
  });
});
