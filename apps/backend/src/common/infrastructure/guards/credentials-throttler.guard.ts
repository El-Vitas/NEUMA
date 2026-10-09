import { Injectable } from '@nestjs/common';
import { THROTTLER_NAMES } from '../../constants/throttler.constants';
import { ScopedThrottlerGuard } from './scoped-throttler.guard';

/** For endpoints reachable by guessing credentials: sign-in, session refresh and sign-up. */
@Injectable()
export class CredentialsThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.perIp, THROTTLER_NAMES.global];
}
