import type { FastifyRequest } from 'fastify';
import type { RequestUser } from '../../types/auth.types';
import { ScopedThrottlerGuard } from './scoped-throttler.guard';

/** Tracks by user rather than address, since an office shares one IP; falls back to the IP without a session. */
export abstract class UserThrottlerGuard extends ScopedThrottlerGuard {
  protected override getTracker(request: FastifyRequest & { user?: RequestUser }): Promise<string> {
    return Promise.resolve(request.user?.payload.sub ?? request.ip);
  }
}
