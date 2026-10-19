import { describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import type { PageContent } from '@neuma/shared';
import request from 'supertest';
import { CollaborationGateway } from '@/modules/collaboration/collaboration.service';
import { replaceCollaborationDocumentContent } from '@/modules/collaboration/utils/collaboration.document.utils';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface IdResponse {
  id: string;
}

const pageOf = (text: string): PageContent => ({
  content: [{ attrs: { id: 'a' }, content: [{ text, type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

const createAdminWithPage = async (
  testApp: TestApp,
): Promise<{ adminId: string; pageId: string; workspaceId: string }> => {
  const timestamp = String(Date.now());
  const email = `shutdown-admin-${timestamp}@test.com`;
  const password = 'plainPassword123';
  const prisma = testApp.get(PrismaService);
  await createAccount(testApp, { email, name: 'Shutdown Admin', password });
  await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
  const token = (await loginUser(testApp, email, password)).accessToken;
  const adminId = (await prisma.models.User.where({ email }).select('id').all().firstOrThrow()).id;
  const space = await request(testApp.getServer())
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Shutdown Space', slug: `shutdown-space-${timestamp}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
    .expect(201);
  const spaceId = (space.body as IdResponse).id;
  const page = await request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/pages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content: pageOf('Antes'), title: 'Apagado' })
    .expect(201);
  const workspaceId = (await prisma.models.Space.where({ id: spaceId }).select('workspaceId').all().firstOrThrow())
    .workspaceId;
  return { adminId, pageId: (page.body as IdResponse).id, workspaceId };
};

describe('Shutting the backend down with a live document open (Integration)', () => {
  it('saves the last edit before the database pool closes', async () => {
    const firstRun = await bootstrapTestApp();
    const { adminId, pageId, workspaceId } = await createAdminWithPage(firstRun);
    const gateway = firstRun.get(CollaborationGateway);
    const connection = await gateway.server.openDirectConnection(`page:${pageId}`, {
      mode: 'write',
      pageId,
      role: 'ADMIN',
      userId: adminId,
      workspaceId,
    });
    await connection.transact((document) => {
      replaceCollaborationDocumentContent(document, pageOf('Lo último'));
    });

    await firstRun.close();

    const secondRun = await bootstrapTestApp();
    try {
      const page = await secondRun
        .get(PrismaService)
        .models.Page.where({ id: pageId })
        .select('content')
        .all()
        .firstOrThrow();
      const storedContent: unknown = page.content;
      expect(storedContent).toEqual(pageOf('Lo último'));
    } finally {
      await secondRun.close();
    }
  });
});
