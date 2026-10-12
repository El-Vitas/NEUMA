import { Injectable } from '@nestjs/common';
import { THROTTLER_NAMES } from '../../../../common/constants/throttler.constants';
import { ScopedThrottlerGuard } from '../../../../common/infrastructure/guards/scoped-throttler.guard';

/** Runs before the token check so invalid keys count too; otherwise guessing is unbounded and hits the database. */
@Injectable()
export class McpIpThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.mcpPerIp];
}
