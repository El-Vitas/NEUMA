import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { THROTTLER_NAMES } from '../../constants/throttler.constants';
import type { RequestUser } from '../../types/auth.types';
import { ScopedThrottlerGuard } from './scoped-throttler.guard';

/** Tracks by user rather than address, since an office shares one IP; falls back to the IP without a session. */
@Injectable()
export class ExportThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.exports];

  protected override getTracker(request: FastifyRequest & { user?: RequestUser }): Promise<string> {
    return Promise.resolve(request.user?.payload.sub ?? request.ip);
  }
}
