import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@neuma/db';
import { Result } from '@neuma/shared';
import request from 'supertest';
import { BlockTransactionRepository } from '@/modules/blocks/infrastructure/persistence/block.transaction.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { createBlockFactory } from '../factories/block.factory';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

const PASSWORD = 'plainPassword123';
const CREATED = 201;

describe('BlockTransactionRepository.run: deadlock retry (Integration)', () => {
  let testApp: TestApp;
  let firstId: string;
  let secondId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const prisma = testApp.get(PrismaService);
    const email = `blocks-retry-${String(Date.now())}@test.com`;
    await createAccount(testApp, { email, name: 'Retry', password: PASSWORD });
    await prisma.models.User.where({ email }).update({ role: 'ADMIN' });
    const token = (await loginUser(testApp, email, PASSWORD)).accessToken;
    const user = await prisma.models.User.where({ email }).first();
    const space = await request(testApp.getServer())
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'retry', slug: `retry-${String(Date.now())}`, visibility: SpaceVisibility.PUBLIC_INTERNAL })
      .expect(CREATED);
    const author = {
      createdById: user?.id ?? '',
      editedById: user?.id ?? '',
      spaceId: (space.body as { id: string }).id,
    };
    const blocks = createBlockFactory(prisma.models);
    firstId = (await blocks.create({ ...author, type: 'page' })).id;
    secondId = (await blocks.create({ ...author, type: 'page' })).id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('runs a transaction again when Postgres picks it as the victim of a deadlock', async () => {
    const repository = testApp.get(BlockTransactionRepository);
    let attempts = 0;
    const bothHoldTheirFirstRow = createBarrier(2);

    const lockInOrder = (ids: readonly string[]) => () =>
      repository.run(async (session) => {
        attempts += 1;
        await session.loadBlocks([ids[0] ?? ''], []);
        await bothHoldTheirFirstRow.arrive();
        await session.loadBlocks([ids[1] ?? ''], []);
        return Result.ok('done');
      });

    const outcomes = await Promise.all([lockInOrder([firstId, secondId])(), lockInOrder([secondId, firstId])()]);

    expect(outcomes.map((outcome) => outcome.isOk())).toEqual([true, true]);
    expect(attempts).toBeGreaterThan(2);
  });

  it('does not retry a failure that is not a deadlock', async () => {
    const repository = testApp.get(BlockTransactionRepository);
    let attempts = 0;

    const run = repository.run(() => {
      attempts += 1;
      return Promise.reject(new Error('boom'));
    });

    const failure = await run.catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('boom');
    expect(attempts).toBe(1);
  });
});

/** Lets the caller wait until `parties` callers have arrived, once; later arrivals pass at once. */
const createBarrier = (parties: number) => {
  let arrived = 0;
  const waiting: (() => void)[] = [];
  return {
    arrive: (): Promise<void> => {
      arrived += 1;
      if (arrived >= parties) {
        for (const release of waiting) release();
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        waiting.push(resolve);
      });
    },
  };
};
