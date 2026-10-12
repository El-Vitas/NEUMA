import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';

/** Enforces only the named throttlers; otherwise every named throttler applies to every throttled route. */
export abstract class ScopedThrottlerGuard extends ThrottlerGuard {
  protected abstract readonly enforcedThrottlers: readonly string[];

  protected override handleRequest(request: ThrottlerRequest): Promise<boolean> {
    if (!this.enforcedThrottlers.includes(request.throttler.name ?? '')) return Promise.resolve(true);
    return super.handleRequest(request);
  }
}
