import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PAGE_RETENTION_INTERVAL_MS } from '../../constants/pages.constants';
import { PagesService } from '../../pages.service';

/**
 * Started by the HTTP server only (`main.ts`): the workers and the admin CLI load the same module, and a timer
 * there would run the retention three times or keep a one-shot command alive.
 */
@Injectable()
export class PageRetentionScheduler implements OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly pagesService: PagesService,
    private readonly logger: PinoLogger,
  ) {}

  start(): void {
    if (this.timer !== undefined) return;
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, PAGE_RETENTION_INTERVAL_MS);
  }

  onApplicationShutdown(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Never throws: a failed run is logged and the next one retries what is still due. */
  async runOnce(): Promise<void> {
    const now = new Date();
    try {
      const purgedCount = await this.pagesService.purgeDuePages(now);
      if (purgedCount > 0) this.logger.info({ purgedCount }, 'purged trashed pages past their deadline');
    } catch (error) {
      this.logger.error({ err: error }, 'purging trashed pages failed; the next run retries');
    }
    try {
      const thinnedCount = await this.pagesService.thinOldVersions(now);
      if (thinnedCount > 0) this.logger.info({ thinnedCount }, 'thinned page versions past the full-history window');
    } catch (error) {
      this.logger.error({ err: error }, 'thinning page versions failed; the next run retries');
    }
  }
}
