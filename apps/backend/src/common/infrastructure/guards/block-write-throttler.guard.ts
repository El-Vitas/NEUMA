import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { THROTTLER_NAMES } from '../../constants/throttler.constants';
import type { RequestUser } from '../../types/auth.types';
import { ScopedThrottlerGuard } from './scoped-throttler.guard';

/** Counts per user, since an office shares one IP. Must run after the JWT guard, which sets the user. */
@Injectable()
export class BlockWriteThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.blockWritesBurst, THROTTLER_NAMES.blockWrites];

  protected override getTracker(request: FastifyRequest & { user?: RequestUser }): Promise<string> {
    return Promise.resolve(request.user?.payload.sub ?? request.ip);
  }
}
