import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import type { NotificationPageView } from '@neuma/shared';
import request from 'supertest';
import { BlockCommitHub } from '@/modules/blocks/block.commit.feed';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import {
  createSeededSpace,
  createSeededUser,
  onlyUserPermissions,
  type SeededUser,
} from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const HTTP_OK = 200;
const SETTLE_ATTEMPTS = 40;
const SETTLE_PAUSE_MS = 50;

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

describe('Mentions written in the text of a page (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: SeededUser;
  let worker: SeededUser;
  let reader: SeededUser;
  let spaceId: string;

  const readInbox = async (token: string): Promise<NotificationPageView> =>
    (
      await request(testApp.getServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(HTTP_OK)
    ).body as NotificationPageView;

  const createMentioningParagraph = async (
    mentioned: SeededUser,
    permissions: ReturnType<typeof onlyUserPermissions> | null = null,
  ): Promise<string> => {
    const blocks = createBlockFactory(prisma.models);
    const page = await blocks.create({ createdById: admin.id, editedById: admin.id, spaceId, type: 'page' });
    const paragraph = await blocks.create({
      createdById: admin.id,
      editedById: admin.id,
      parentId: page.id,
      permissions,
      properties: {
        title: [{ insert: 'Para ' }, { insert: { person: { label: 'Alguien', userId: mentioned.id } } }],
      },
      spaceId,
      text: 'Para Alguien',
      type: 'paragraph',
    });
    return paragraph.id;
  };

  const commit = (blockId: string, userId: string): void => {
    testApp.get(BlockCommitHub).publish({ blockIds: [blockId], spaceId, userId });
  };

  const settle = async (token: string, expectedCount: number): Promise<NotificationPageView> => {
    for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
      const inbox = await readInbox(token);
      if (inbox.notifications.length >= expectedCount) return inbox;
      await wait(SETTLE_PAUSE_MS);
    }
    return readInbox(token);
  };

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'text-mentions-admin', 'ADMIN');
    worker = await createSeededUser(testApp, 'text-mentions-worker', 'WORKER');
    reader = await createSeededUser(testApp, 'text-mentions-reader', 'CLIENT');
    spaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('tells the person named in a committed block, once, however many times the block is saved again', async () => {
    const blockId = await createMentioningParagraph(worker);

    commit(blockId, admin.id);
    await settle(worker.token, 1);
    commit(blockId, admin.id);
    await wait(SETTLE_PAUSE_MS * 4);

    const inbox = await readInbox(worker.token);
    const mentions = inbox.notifications.filter((notification) => notification.blockId === blockId);
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.kind).toBe('MENTION');
    expect(mentions[0]?.actorId).toBe(admin.id);
    expect(mentions[0]?.discussionId).toBeNull();
    expect(mentions[0]?.excerpt).toBe('Para Alguien');
  });

  it('does not tell a person who cannot read the block', async () => {
    const blockId = await createMentioningParagraph(reader, onlyUserPermissions(admin.id));

    commit(blockId, admin.id);
    await wait(SETTLE_PAUSE_MS * 6);

    const inbox = await readInbox(reader.token);
    expect(inbox.notifications.some((notification) => notification.blockId === blockId)).toBe(false);
  });

  it('does not tell the author about mentioning themselves', async () => {
    const blockId = await createMentioningParagraph(admin);

    commit(blockId, admin.id);
    await wait(SETTLE_PAUSE_MS * 6);

    const inbox = await readInbox(admin.token);
    expect(inbox.notifications.some((notification) => notification.blockId === blockId)).toBe(false);
  });
});
