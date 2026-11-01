import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { USER_ROLE } from '@neuma/shared';
import request from 'supertest';
import { WorkspaceContextService } from '@/common/infrastructure/persistence/workspace-context.service';
import { LinksService } from '@/modules/links/links.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import {
  createSeededSpace,
  createSeededUser,
  onlyUserPermissions,
  type SeededUser,
} from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface BacklinkItemResponse {
  id: string;
  spaceId: string;
  title: string;
}

interface BacklinksResponse {
  count: number;
  items: BacklinkItemResponse[];
}

const HTTP_OK = 200;

describe('Backlinks (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: SeededUser;
  let outsider: SeededUser;
  let sharedSpaceId: string;
  let secretSpaceId: string;

  const blocks = () => createBlockFactory(prisma.models);

  const createPage = async (
    spaceId: string,
    title: string,
    overrides: {
      lifecycle?: 'ACTIVE' | 'TRASHED';
      parentId?: string;
      permissions?: ReturnType<typeof onlyUserPermissions>;
    } = {},
  ): Promise<string> => {
    const page = await blocks().create({
      createdById: admin.id,
      editedById: admin.id,
      spaceId,
      title,
      type: 'page',
      ...overrides,
    });
    return page.id;
  };

  const createLink = async (
    sourceBlockId: string,
    sourcePageId: string,
    targetBlockId: string,
    kind = 'mention',
  ): Promise<void> => {
    await prisma.models.BlockLink.create({ kind, sourceBlockId, sourcePageId, targetBlockId });
  };

  const createLinkingParagraph = async (
    pageId: string,
    spaceId: string,
    targetId: string,
    permissions: ReturnType<typeof onlyUserPermissions> | null = null,
  ): Promise<string> => {
    const paragraph = await blocks().create({
      createdById: admin.id,
      editedById: admin.id,
      parentId: pageId,
      permissions,
      spaceId,
      type: 'paragraph',
    });
    await createLink(paragraph.id, pageId, targetId);
    return paragraph.id;
  };

  const getBacklinks = (token: string, pageId: string) =>
    request(testApp.getServer()).get(`/api/v1/pages/${pageId}/backlinks`).set('Authorization', `Bearer ${token}`);

  const readBacklinks = async (token: string, pageId: string): Promise<BacklinksResponse> =>
    (await getBacklinks(token, pageId).expect(HTTP_OK)).body as BacklinksResponse;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'links-admin', 'ADMIN');
    outsider = await createSeededUser(testApp, 'links-outsider', 'CLIENT');
    sharedSpaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    secretSpaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.RESTRICTED);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('visibility of the source', () => {
    it('hides a backlink from a space the reader cannot access, from both the list and the count', async () => {
      const targetId = await createPage(sharedSpaceId, 'Auth Target');
      const visibleSourceId = await createPage(sharedSpaceId, 'Auth Visible Source');
      const hiddenSourceId = await createPage(secretSpaceId, 'Auth Hidden Source');
      await createLinkingParagraph(visibleSourceId, sharedSpaceId, targetId);
      await createLinkingParagraph(hiddenSourceId, secretSpaceId, targetId);

      const asOutsider = await readBacklinks(outsider.token, targetId);
      const asAdmin = await readBacklinks(admin.token, targetId);

      expect(asOutsider.items.map((item) => item.id)).toEqual([visibleSourceId]);
      expect(asOutsider.count).toBe(1);
      expect(asAdmin.items.map((item) => item.id).sort()).toEqual([hiddenSourceId, visibleSourceId].sort());
      expect(asAdmin.count).toBe(2);
    });

    it('hides a backlink whose page declares permissions the reader does not hold', async () => {
      const targetId = await createPage(sharedSpaceId, 'Page Perm Target');
      const hiddenSourceId = await createPage(sharedSpaceId, 'Page Perm Hidden', {
        permissions: onlyUserPermissions(admin.id),
      });
      await createLinkingParagraph(hiddenSourceId, sharedSpaceId, targetId);

      const asOutsider = await readBacklinks(outsider.token, targetId);

      expect(asOutsider).toEqual({ count: 0, items: [] });
    });

    it('hides a backlink whose source block is hidden even when its page is readable', async () => {
      const targetId = await createPage(sharedSpaceId, 'Block Perm Target');
      const readablePageId = await createPage(sharedSpaceId, 'Block Perm Page');
      await createLinkingParagraph(readablePageId, sharedSpaceId, targetId, onlyUserPermissions(admin.id));

      const asOutsider = await readBacklinks(outsider.token, targetId);
      const asAdmin = await readBacklinks(admin.token, targetId);

      expect(asOutsider).toEqual({ count: 0, items: [] });
      expect(asAdmin.items.map((item) => item.id)).toEqual([readablePageId]);
    });

    it('lists a page once however many of its blocks link to the target', async () => {
      const targetId = await createPage(sharedSpaceId, 'Grouped Target');
      const sourceId = await createPage(sharedSpaceId, 'Grouped Source');
      await createLinkingParagraph(sourceId, sharedSpaceId, targetId);
      await createLinkingParagraph(sourceId, sharedSpaceId, targetId);

      const result = await readBacklinks(admin.token, targetId);

      expect(result.count).toBe(1);
      expect(result.items).toEqual([{ id: sourceId, spaceId: sharedSpaceId, title: 'Grouped Source' }]);
    });
  });

  describe('what counts as a backlink', () => {
    it('counts only mentions: a parent holding a subpage, a synced source or a collection is not a backlink', async () => {
      const targetId = await createPage(sharedSpaceId, 'Kinds Target');
      const mentionPageId = await createPage(sharedSpaceId, 'Kinds Mention');
      const parentPageId = await createPage(sharedSpaceId, 'Kinds Parent');
      const syncedPageId = await createPage(sharedSpaceId, 'Kinds Synced');
      const collectionPageId = await createPage(sharedSpaceId, 'Kinds Collection');
      await createLinkingParagraph(mentionPageId, sharedSpaceId, targetId);
      for (const [pageId, kind] of [
        [parentPageId, 'subpage'],
        [syncedPageId, 'synced'],
        [collectionPageId, 'collection'],
      ] as const) {
        const block = await blocks().create({
          createdById: admin.id,
          editedById: admin.id,
          parentId: pageId,
          spaceId: sharedSpaceId,
          type: 'paragraph',
        });
        await createLink(block.id, pageId, targetId, kind);
      }

      const result = await readBacklinks(admin.token, targetId);

      expect(result.items.map((item) => item.id)).toEqual([mentionPageId]);
      expect(result.count).toBe(1);
    });

    it('counts every linking page when far more links than any scan cap come from few pages', async () => {
      const targetId = await createPage(sharedSpaceId, 'Many Links Target');
      const firstPageId = await createPage(sharedSpaceId, 'Many Links First');
      const secondPageId = await createPage(sharedSpaceId, 'Many Links Second');
      const linkCount = 2100;
      const rows = Array.from({ length: linkCount }, (_, index) => ({
        id: crypto.randomUUID(),
        pageId: index % 2 === 0 ? firstPageId : secondPageId,
      }));
      await prisma.models.Block.createAll(
        rows.map((row) => ({
          createdById: admin.id,
          editedById: admin.id,
          id: row.id,
          parentId: row.pageId,
          properties: {},
          spaceId: sharedSpaceId,
          type: 'paragraph',
        })),
      );
      await prisma.models.BlockLink.createAll(
        rows.map((row) => ({
          kind: 'mention',
          sourceBlockId: row.id,
          sourcePageId: row.pageId,
          targetBlockId: targetId,
        })),
      );

      const result = await readBacklinks(admin.token, targetId);

      expect(result.count).toBe(2);
      expect(result.items.map((item) => item.id).sort()).toEqual([firstPageId, secondPageId].sort());
    });

    it('counts a page whose first linking block is hidden when another linking block is readable', async () => {
      const targetId = await createPage(sharedSpaceId, 'Fallback Target');
      const sourceId = await createPage(sharedSpaceId, 'Fallback Source');
      await createLinkingParagraph(sourceId, sharedSpaceId, targetId, onlyUserPermissions(admin.id));
      await createLinkingParagraph(sourceId, sharedSpaceId, targetId);

      const asOutsider = await readBacklinks(outsider.token, targetId);

      expect(asOutsider.items.map((item) => item.id)).toEqual([sourceId]);
      expect(asOutsider.count).toBe(1);
    });
  });

  describe('visibility of the target', () => {
    it('answers an empty list when the reader cannot read the target', async () => {
      const targetId = await createPage(sharedSpaceId, 'Hidden Target', { permissions: onlyUserPermissions(admin.id) });
      const sourceId = await createPage(sharedSpaceId, 'Source Of Hidden Target');
      await createLinkingParagraph(sourceId, sharedSpaceId, targetId);

      expect(await readBacklinks(outsider.token, targetId)).toEqual({ count: 0, items: [] });
    });
  });

  describe('lifecycle', () => {
    it('excludes a trashed source page and a trashed target, and brings them back when restored', async () => {
      const targetId = await createPage(sharedSpaceId, 'Trash Target');
      const sourceId = await createPage(sharedSpaceId, 'Trash Source');
      await createLinkingParagraph(sourceId, sharedSpaceId, targetId);
      expect((await readBacklinks(admin.token, targetId)).count).toBe(1);

      await prisma.models.Block.where({ id: sourceId }).update({ lifecycle: 'TRASHED' });
      expect(await readBacklinks(admin.token, targetId)).toEqual({ count: 0, items: [] });

      await prisma.models.Block.where({ id: sourceId }).update({ lifecycle: 'ACTIVE' });
      await prisma.models.Block.where({ id: targetId }).update({ lifecycle: 'TRASHED' });
      expect(await readBacklinks(admin.token, targetId)).toEqual({ count: 0, items: [] });

      await prisma.models.Block.where({ id: targetId }).update({ lifecycle: 'ACTIVE' });
      expect((await readBacklinks(admin.token, targetId)).items.map((item) => item.id)).toEqual([sourceId]);
    });

    it('excludes a source nested under a trashed page', async () => {
      const targetId = await createPage(sharedSpaceId, 'Nested Trash Target');
      const trashedParentId = await createPage(sharedSpaceId, 'Trashed Parent', { lifecycle: 'TRASHED' });
      const nestedSourceId = await createPage(sharedSpaceId, 'Nested Source', { parentId: trashedParentId });
      await createLinkingParagraph(nestedSourceId, sharedSpaceId, targetId);

      expect(await readBacklinks(admin.token, targetId)).toEqual({ count: 0, items: [] });
    });
  });

  describe('freshness', () => {
    it('lists a backlink right after the transaction that wrote the mention, with no worker in between', async () => {
      const targetId = await createPage(sharedSpaceId, 'Fresh Target');
      const sourceId = await createPage(sharedSpaceId, 'Fresh Source');
      const paragraphId = crypto.randomUUID();
      const mention = { insert: { mention: { label: 'Fresh Target', pageId: targetId, spaceId: sharedSpaceId } } };

      await request(testApp.getServer())
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          transactions: [
            {
              id: crypto.randomUUID(),
              operations: [
                {
                  args: { id: paragraphId, parentId: sourceId, properties: { title: [mention] }, type: 'paragraph' },
                  command: 'set',
                  path: [],
                  pointer: { id: paragraphId, table: 'block' },
                },
                {
                  args: { id: paragraphId },
                  command: 'listAfter',
                  path: ['children'],
                  pointer: { id: sourceId, table: 'block' },
                },
              ],
              spaceId: sharedSpaceId,
            },
          ],
        })
        .expect(HTTP_OK);

      const result = await readBacklinks(admin.token, targetId);

      expect(result.items.map((item) => item.id)).toEqual([sourceId]);
    });
  });

  describe('outgoing links', () => {
    it('lists the readable pages a page points to and drops the ones the reader cannot read', async () => {
      const sourceId = await createPage(sharedSpaceId, 'Outgoing Source');
      const readableTargetId = await createPage(sharedSpaceId, 'Outgoing Readable');
      const hiddenTargetId = await createPage(secretSpaceId, 'Outgoing Hidden');
      await createLinkingParagraph(sourceId, sharedSpaceId, readableTargetId);
      await createLinkingParagraph(sourceId, sharedSpaceId, hiddenTargetId);
      const workspace = await testApp.get(WorkspaceContextService).resolveForUser(outsider.id, USER_ROLE.CLIENT);

      const asOutsider = await testApp
        .get(LinksService)
        .listOutgoingLinks(sourceId, workspace.id, outsider.id, USER_ROLE.CLIENT);

      expect(asOutsider.items.map((item) => item.id)).toEqual([readableTargetId]);
      expect(asOutsider.count).toBe(1);
    });
  });
});
