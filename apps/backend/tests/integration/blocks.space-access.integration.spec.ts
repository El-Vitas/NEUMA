import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { USER_ROLE } from '@neuma/shared';
import { BlockRepository } from '@/modules/blocks/infrastructure/persistence/block.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createSeededSpace, createSeededUser, type SeededUser } from '../helpers/block-access.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

describe('Readable spaces of many readers at once (Integration)', () => {
  let testApp: TestApp;
  let repository: BlockRepository;
  let workspaceId: string;
  let admin: SeededUser;
  let worker: SeededUser;
  let client: SeededUser;
  let spaceIds: string[];

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const prisma = testApp.get(PrismaService);
    repository = new BlockRepository(prisma);
    admin = await createSeededUser(testApp, 'Access Admin', 'ADMIN');
    worker = await createSeededUser(testApp, 'Access Worker', 'WORKER');
    client = await createSeededUser(testApp, 'Access Client', 'CLIENT');
    const open = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    const restricted = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    const sharedRestricted = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    const privateSpace = await createSeededSpace(testApp, admin.token, SpaceVisibility.PUBLIC_INTERNAL);
    await prisma.models.Space.where({ id: restricted }).update({ visibility: SpaceVisibility.RESTRICTED });
    await prisma.models.Space.where({ id: sharedRestricted }).update({ visibility: SpaceVisibility.RESTRICTED });
    await prisma.models.Space.where({ id: privateSpace }).update({
      ownerId: admin.id,
      visibility: SpaceVisibility.PRIVATE,
    });
    await prisma.models.SpaceMember.create({ spaceId: sharedRestricted, userId: worker.id });
    await prisma.models.SpaceMember.create({ spaceId: privateSpace, userId: client.id });
    spaceIds = [open, restricted, sharedRestricted, privateSpace];
    const space = await prisma.models.Space.select('workspaceId').where({ id: open }).first();
    workspaceId = space?.workspaceId ?? '';
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('answers each reader what the one-reader lookup answers', async () => {
    const readers = [admin, worker, client].map((user, index) => ({
      role: [USER_ROLE.ADMIN, USER_ROLE.WORKER, USER_ROLE.CLIENT][index] ?? USER_ROLE.CLIENT,
      userId: user.id,
      workspaceId,
    }));

    const together = await repository.findReadableSpaceIdsByReader(spaceIds, readers);

    for (const reader of readers) {
      const alone = await repository.findReadableSpaceIds(spaceIds, reader);
      expect(together.get(reader.userId)).toEqual(alone);
    }
  });

  it('answers an empty set to every reader when there is no space to ask about', async () => {
    const together = await repository.findReadableSpaceIdsByReader(
      [],
      [{ role: USER_ROLE.WORKER, userId: worker.id, workspaceId }],
    );

    expect(together.get(worker.id)).toEqual(new Set());
  });
});
