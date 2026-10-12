import { Injectable } from '@nestjs/common';
import { THROTTLER_NAMES } from '../../../../common/constants/throttler.constants';
import { ScopedThrottlerGuard } from '../../../../common/infrastructure/guards/scoped-throttler.guard';
import type { AccessTokenRequest } from '../../../../common/types/access-token.types';

/** Must run after the token guard, which records the token the count is keyed on. */
@Injectable()
export class McpThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.mcp];

  protected override getTracker(request: AccessTokenRequest): Promise<string> {
    const tokenId = request.accessTokenPrincipal?.tokenId;
    if (tokenId === undefined) throw new Error('The MCP throttler ran before the access token guard');
    return Promise.resolve(tokenId);
  }
}
