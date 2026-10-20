import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { THROTTLER_NAMES } from '../../../../common/constants/throttler.constants';
import { ScopedThrottlerGuard } from '../../../../common/infrastructure/guards/scoped-throttler.guard';
import type { RequestUser } from '../../../../common/types/auth.types';

/** Counts per user, since an office shares one IP. Must run after the JWT guard, which sets the user. */
@Injectable()
export class BlockWriteThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.blockWritesBurst, THROTTLER_NAMES.blockWrites];

  protected override getTracker(request: FastifyRequest & { user?: RequestUser }): Promise<string> {
    return Promise.resolve(request.user?.payload.sub ?? request.ip);
  }
}
