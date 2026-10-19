import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import request from 'supertest';
import { PagesService } from '@/modules/pages/pages.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

const content = {
  content: [{ content: [{ text: 'x', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

describe('Thinning old page history (Integration)', () => {
  let testApp: TestApp;
  let pageId: string;
  let authorId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const timestamp = String(Date.now());
    const email = `retention-${timestamp}@test.com`;
    const password = 'plainPassword123';
    const prisma = testApp.get(PrismaService);
    await createAccount(testApp, { email, name: 'Retention Admin', password });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    const token = (await loginUser(testApp, email, password)).accessToken;
    authorId = (await prisma.models.User.where({ email }).select('id').all().firstOrThrow()).id;
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Retention', slug: `retention-${timestamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(201);
    const page = await request(testApp.getServer())
      .post(`/api/v1/spaces/${(space.body as IdResponse).id}/pages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content, title: 'Historial' })
      .expect(201);
    pageId = (page.body as IdResponse).id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('keeps the last version of each old day and every version of the last month', async () => {
    const prisma = testApp.get(PrismaService);
    const now = new Date('2026-12-31T15:00:00.000Z');
    const at = (iso: string, version: number) => ({
      content,
      createdAt: new Date(iso),
      createdById: authorId,
      pageId,
      title: 'Historial',
      version,
    });
    await prisma.models.PageVersion.createAll([
      at('2026-10-01T13:00:00.000Z', 10),
      at('2026-10-01T15:00:00.000Z', 11),
      at('2026-10-01T18:00:00.000Z', 12),
      at('2026-10-02T13:00:00.000Z', 13),
      at('2026-12-30T13:00:00.000Z', 14),
      at('2026-12-30T14:00:00.000Z', 15),
    ]);

    await testApp.get(PagesService).thinOldVersions(now);

    const kept = await prisma.models.PageVersion.where({ pageId })
      .where((entry) => entry.version.gte(10))
      .select('version')
      .orderBy((entry) => entry.version.asc())
      .all();
    expect(kept.map((entry) => entry.version)).toEqual([12, 13, 14, 15]);
  });
});
