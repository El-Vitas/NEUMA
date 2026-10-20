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

interface FileAssetMetadataResponse {
  id: string;
  mimeType: string;
  originalFilename: string;
  size: number;
  uploadedBy: string;
}

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_FORBIDDEN = 403;

describe('Files (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: SeededUser;
  let outsider: SeededUser;
  let publicSpaceId: string;
  let restrictedSpaceId: string;
  let pageId: string;

  const blocks = () => createBlockFactory(prisma.models);

  const createPage = async (spaceId: string, title: string): Promise<string> =>
    (await blocks().create({ createdById: admin.id, editedById: admin.id, spaceId, title, type: 'page' })).id;

  const uploadAttachment = async (token: string, targetPageId: string): Promise<string> => {
    const response = await request(testApp.getServer())
      .post('/api/v1/files')
      .query({ pageId: targetPageId })
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('attachment contents'), 'attachment.txt')
      .expect(HTTP_CREATED);
    return (response.body as FileAssetMetadataResponse).id;
  };

  const listAttachments = (token: string, targetPageId: string) =>
    request(testApp.getServer()).get(`/api/v1/files/page/${targetPageId}`).set('Authorization', `Bearer ${token}`);

  const download = (token: string, assetId: string) =>
    request(testApp.getServer()).get(`/api/v1/files/${assetId}`).set('Authorization', `Bearer ${token}`);

  const createReferencingBlock = async (
    parentId: string,
    spaceId: string,
    assetId: string,
    permissions: ReturnType<typeof onlyUserPermissions> | null = null,
  ): Promise<void> => {
    await blocks().create({
      createdById: admin.id,
      editedById: admin.id,
      parentId,
      permissions,
      properties: { assetId },
      spaceId,
      type: 'image',
    });
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'Files Admin', 'ADMIN');
    outsider = await createSeededUser(testApp, 'files-outsider', 'CLIENT');
    publicSpaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    restrictedSpaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.RESTRICTED);
    pageId = await createPage(restrictedSpaceId, 'Attachment host page');
    await uploadAttachment(admin.token, pageId);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('refuses an upload that carries more form fields than an upload needs', async () => {
    const upload = request(testApp.getServer())
      .post('/api/v1/files')
      .query({ pageId })
      .set('Authorization', `Bearer ${admin.token}`);
    for (let index = 0; index < 20; index += 1) {
      upload.field(`extra${String(index)}`, 'x');
    }

    const response = await upload.attach('file', Buffer.from('attachment contents'), 'attachment.txt');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it('lets an authorized member see the page attachments with only non-sensitive metadata', async () => {
    const response = await listAttachments(admin.token, pageId).expect(HTTP_OK);
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
    await listAttachments(outsider.token, pageId).expect(HTTP_FORBIDDEN);
  });

  describe('assets referenced by a block', () => {
    it('makes an asset readable through a readable block that references it', async () => {
      const assetId = await uploadAttachment(admin.token, pageId);
      await download(outsider.token, assetId).expect(HTTP_FORBIDDEN);
      const readerPageId = await createPage(publicSpaceId, 'Page that shows the asset');
      await createReferencingBlock(readerPageId, publicSpaceId, assetId);

      await download(outsider.token, assetId).expect(HTTP_OK);
    });

    it('does not make an asset readable through a block the reader cannot read', async () => {
      const assetId = await uploadAttachment(admin.token, pageId);
      const hiddenPageId = await createPage(publicSpaceId, 'Page with a hidden block');
      await createReferencingBlock(hiddenPageId, publicSpaceId, assetId, onlyUserPermissions(admin.id));

      await download(outsider.token, assetId).expect(HTTP_FORBIDDEN);
    });

    it('does not make an asset readable through a block in the trash', async () => {
      const assetId = await uploadAttachment(admin.token, pageId);
      const trashedPageId = await createPage(publicSpaceId, 'Trashed page with the asset');
      await createReferencingBlock(trashedPageId, publicSpaceId, assetId);
      await prisma.models.Block.where({ id: trashedPageId }).update({ lifecycle: 'TRASHED' });

      await download(outsider.token, assetId).expect(HTTP_FORBIDDEN);
    });
  });
});
