import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { IntervalScheduler } from '../../../../common/infrastructure/schedulers/interval.scheduler';
import { NOTIFICATION_RETENTION_INTERVAL_MS } from '../../constants/notifications.constants';
import { NotificationsService } from '../../notifications.service';

/**
 * Started by the HTTP server only (`main.ts`), like the page retention: the admin CLI and the MCP process load the
 * same modules, and a timer there would run it again or keep a one-shot command alive.
 */
@Injectable()
export class NotificationRetentionScheduler extends IntervalScheduler {
  protected readonly intervalMs = NOTIFICATION_RETENTION_INTERVAL_MS;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  /** Never throws: a failed run is logged and the next one retries what is still due. */
  override async runOnce(): Promise<void> {
    try {
      const deletedCount = await this.notificationsService.purgeReadPastRetention(new Date());
      if (deletedCount > 0) this.logger.info({ deletedCount }, 'deleted read notifications past their retention');
    } catch (error) {
      this.logger.error({ err: error }, 'deleting read notifications failed; the next run retries');
    }
  }
}
