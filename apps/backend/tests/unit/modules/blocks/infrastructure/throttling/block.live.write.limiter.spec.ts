import { afterEach, describe, expect, it } from 'bun:test';
import { seconds, ThrottlerStorageService } from '@nestjs/throttler';
import { BLOCK_WRITE_RATE_LIMIT, THROTTLER_NAMES } from '@/common/constants/throttler.constants';
import { BlockLiveWriteLimiter } from '@/modules/blocks/infrastructure/throttling/block.live.write.limiter';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

describe('BlockLiveWriteLimiter', () => {
  const storages: ThrottlerStorageService[] = [];

  const buildStorage = (): ThrottlerStorageService => {
    const storage = new ThrottlerStorageService();
    storages.push(storage);
    return storage;
  };

  afterEach(() => {
    storages.splice(0).forEach((storage) => {
      storage.onApplicationShutdown();
    });
  });

  it('allows the writes up to the burst limit and refuses the next one', async () => {
    const limiter = new BlockLiveWriteLimiter(buildStorage());

    const answers: boolean[] = [];
    for (let index = 0; index < BLOCK_WRITE_RATE_LIMIT.burstLimit + 1; index += 1) {
      answers.push(await limiter.isAllowed(USER_ID));
    }

    expect(answers.slice(0, BLOCK_WRITE_RATE_LIMIT.burstLimit).every(Boolean)).toBe(true);
    expect(answers.at(-1)).toBe(false);
  });

  it('counts per user', async () => {
    const limiter = new BlockLiveWriteLimiter(buildStorage());
    for (let index = 0; index < BLOCK_WRITE_RATE_LIMIT.burstLimit + 1; index += 1) {
      await limiter.isAllowed(USER_ID);
    }

    expect(await limiter.isAllowed(OTHER_USER_ID)).toBe(true);
  });

  it('shares the allowance with the hits the HTTP guard records in the same storage', async () => {
    const storage = buildStorage();
    const burstTtl = seconds(BLOCK_WRITE_RATE_LIMIT.burstWindowSeconds);
    for (let index = 0; index < BLOCK_WRITE_RATE_LIMIT.burstLimit; index += 1) {
      await storage.increment(
        `${THROTTLER_NAMES.blockWritesBurst}:${USER_ID}`,
        burstTtl,
        BLOCK_WRITE_RATE_LIMIT.burstLimit,
        burstTtl,
        THROTTLER_NAMES.blockWritesBurst,
      );
    }

    expect(await new BlockLiveWriteLimiter(storage).isAllowed(USER_ID)).toBe(false);
  });

  it('records its hits under the keys the HTTP guard reads', async () => {
    const storage = buildStorage();
    const limiter = new BlockLiveWriteLimiter(storage);
    for (let index = 0; index < BLOCK_WRITE_RATE_LIMIT.burstLimit; index += 1) {
      await limiter.isAllowed(USER_ID);
    }
    const burstTtl = seconds(BLOCK_WRITE_RATE_LIMIT.burstWindowSeconds);

    const next = await storage.increment(
      `${THROTTLER_NAMES.blockWritesBurst}:${USER_ID}`,
      burstTtl,
      BLOCK_WRITE_RATE_LIMIT.burstLimit,
      burstTtl,
      THROTTLER_NAMES.blockWritesBurst,
    );

    expect(next.isBlocked).toBe(true);
  });
});
