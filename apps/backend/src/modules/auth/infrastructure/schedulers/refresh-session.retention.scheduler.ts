import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { IntervalScheduler } from '../../../../common/infrastructure/schedulers/interval.scheduler';
import { AuthService } from '../../auth.service';
import { REFRESH_SESSION_RETENTION_INTERVAL_MS } from '../../constants/auth.token.constants';

/** Started by the HTTP server only (`main.ts`), like the notification retention. */
@Injectable()
export class RefreshSessionRetentionScheduler extends IntervalScheduler {
  protected readonly intervalMs = REFRESH_SESSION_RETENTION_INTERVAL_MS;

  constructor(
    private readonly authService: AuthService,
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  /** Never throws: a failed run is logged and the next one retries what is still due. */
  override async runOnce(): Promise<void> {
    try {
      const deletedCount = await this.authService.purgeExpiredRefreshSessions(new Date());
      if (deletedCount > 0) this.logger.info({ deletedCount }, 'deleted expired refresh sessions');
    } catch (error) {
      this.logger.error({ err: error }, 'deleting expired refresh sessions failed; the next run retries');
    }
  }
}
