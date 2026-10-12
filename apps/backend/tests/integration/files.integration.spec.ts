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

interface FileAssetMetadataResponse {
  id: string;
  mimeType: string;
  originalFilename: string;
  size: number;
  uploadedBy: string;
}

const promoteToAdmin = async (testApp: TestApp, email: string): Promise<void> => {
  const prisma = testApp.get(PrismaService);
  await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
};

const createRestrictedPage = async (testApp: TestApp, token: string, timestamp: number): Promise<string> => {
  const spaceResponse = await request(testApp.getServer())
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Restricted Files Space',
      slug: `restricted-files-${String(timestamp)}`,
      visibility: SpaceVisibility.RESTRICTED,
    })
    .expect(201);
  const space = spaceResponse.body as SpaceResponse;

  const content: PageContent = {
    content: [{ content: [{ text: 'attachment host page', type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  };
  const pageResponse = await request(testApp.getServer())
    .post(`/api/v1/spaces/${space.id}/pages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content, title: 'Attachment host page' })
    .expect(201);
  const page = pageResponse.body as PageResponse;
  return page.id;
};

const uploadAttachment = async (testApp: TestApp, token: string, pageId: string): Promise<void> => {
  await request(testApp.getServer())
    .post('/api/v1/files')
    .query({ pageId })
    .set('Authorization', `Bearer ${token}`)
    .attach('file', Buffer.from('attachment contents'), 'attachment.txt')
    .expect(201);
};

const listAttachments = (testApp: TestApp, token: string, pageId: string) =>
  request(testApp.getServer()).get(`/api/v1/files/page/${pageId}`).set('Authorization', `Bearer ${token}`);

describe('Files (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let outsiderToken: string;
  let pageId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    const adminEmail = `files-admin-${String(timestamp)}@test.com`;
    const outsiderEmail = `files-outsider-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await createAccount(testApp, { email: adminEmail, name: 'Files Admin', password });
    await createAccount(testApp, { email: outsiderEmail, name: 'Files Outsider', password });
    await promoteToAdmin(testApp, adminEmail);

    const adminSession = await loginUser(testApp, adminEmail, password);
    const outsiderSession = await loginUser(testApp, outsiderEmail, password);
    adminToken = adminSession.accessToken;
    outsiderToken = outsiderSession.accessToken;

    pageId = await createRestrictedPage(testApp, adminToken, timestamp);
    await uploadAttachment(testApp, adminToken, pageId);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('lets an authorized member see the page attachments with only non-sensitive metadata', async () => {
    const response = await listAttachments(testApp, adminToken, pageId).expect(200);
    const attachments = response.body as FileAssetMetadataResponse[];

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toEqual({
      id: attachments[0]?.id ?? '',
      mimeType: 'text/plain',
      originalFilename: 'attachment.txt',
      size: Buffer.from('attachment contents').length,
      uploadedBy: 'Files Admin',
    });
    expect(attachments[0]).not.toHaveProperty('storageKey');
    expect(attachments[0]).not.toHaveProperty('checksum');
    expect(attachments[0]).not.toHaveProperty('ownerId');
  });

  it('denies a non-member, non-admin user from enumerating the page attachments', async () => {
    await listAttachments(testApp, outsiderToken, pageId).expect(403);
  });
});
