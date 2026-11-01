import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { buildThrottlerKey } from '../../../../common/utils/throttler.utils';
import { BLOCK_LIVE_WRITE_THROTTLES } from '../../constants/block.live.constants';
import type { BlockLiveWriteLimit } from '../../types/block.live.types';

/**
 * Counts a write of the socket in the throttler storage the HTTP guard uses, under the same key. The guard needs an
 * HTTP request to run, so the socket calls the storage itself; the allowance stays one per user.
 */
@Injectable()
export class BlockLiveWriteLimiter implements BlockLiveWriteLimit {
  constructor(@Inject(ThrottlerStorage) private readonly storage: ThrottlerStorage) {}

  /** Stops at the first limit that is exceeded, as the guard does. */
  async isAllowed(userId: string): Promise<boolean> {
    for (const throttle of BLOCK_LIVE_WRITE_THROTTLES) {
      const record = await this.storage.increment(
        buildThrottlerKey(throttle.name, userId),
        throttle.ttlMs,
        throttle.limit,
        throttle.ttlMs,
        throttle.name,
      );
      if (record.isBlocked) return false;
    }
    return true;
  }
}
