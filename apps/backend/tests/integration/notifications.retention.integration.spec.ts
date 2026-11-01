import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import { createSeededSpace, createSeededUser, type SeededUser } from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const DAY_MS = 86_400_000;

describe('Notification retention (Integration)', () => {
  let testApp: TestApp;
  let prisma: PrismaService;
  let admin: SeededUser;
  let worker: SeededUser;
  let blockId: string;

  const createNotification = async (readAt: Date | null): Promise<string> => {
    const created = await prisma.models.Notification.select('id').create({
      actorId: admin.id,
      blockId,
      kind: 'MENTION',
      readAt,
      recipientId: worker.id,
    });
    return created.id;
  };

  const exists = async (notificationId: string): Promise<boolean> =>
    (await prisma.models.Notification.where({ id: notificationId }).first()) !== null;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    prisma = testApp.get(PrismaService);
    admin = await createSeededUser(testApp, 'retention-admin', 'ADMIN');
    worker = await createSeededUser(testApp, 'retention-worker', 'WORKER');
    const spaceId = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    const block = await createBlockFactory(prisma.models).create({
      createdById: admin.id,
      editedById: admin.id,
      spaceId,
      type: 'page',
    });
    blockId = block.id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('deletes a notification read more than 90 days ago and keeps the rest', async () => {
    const now = new Date();
    const longRead = await createNotification(new Date(now.getTime() - 91 * DAY_MS));
    const recentlyRead = await createNotification(new Date(now.getTime() - 89 * DAY_MS));
    const neverRead = await createNotification(null);

    const deleted = await testApp.get(NotificationsService).purgeReadPastRetention(now);

    expect(deleted).toBeGreaterThanOrEqual(1);
    expect(await exists(longRead)).toBe(false);
    expect(await exists(recentlyRead)).toBe(true);
    expect(await exists(neverRead)).toBe(true);
  });

  it('never deletes an unread notification, however old', async () => {
    const ancient = await createNotification(null);
    await prisma.models.Notification.where({ id: ancient }).update({
      createdAt: new Date(Date.now() - 3000 * DAY_MS),
    });

    await testApp.get(NotificationsService).purgeReadPastRetention(new Date(Date.now() + 3000 * DAY_MS));

    expect(await exists(ancient)).toBe(true);
  });
});
