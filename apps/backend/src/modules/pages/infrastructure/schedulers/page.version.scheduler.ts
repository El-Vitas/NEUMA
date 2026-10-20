import { type BeforeApplicationShutdown, Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BLOCK_COMMITS } from '../../../../common/constants/block-writer.constants';
import type { BlockCommit, BlockCommitFeed } from '../../../../common/types/block-writer.types';
import { PAGE_VERSION_CLOCK, PAGE_VERSION_IDLE_MS, PAGE_VERSION_MAX_WAIT_MS } from '../../constants/pages.constants';
import type {
  PageOwnerFinder,
  PageVersionClock,
  PageVersionLogger,
  PageVersionRecorder,
  PendingPageVersion,
} from '../../types/page.version.types';
import { PageBlockReader } from '../persistence/page.block.reader';
import { PageVersionRepository } from '../persistence/page.version.repository';

/**
 * Cuts the versions of the pages the editor writes. Each person's transactions pile up while they keep writing; after
 * a quiet moment, or at most a few seconds after the first one, one version is cut for every page they touched.
 * It lives in this process only, like the live save it replaces, and what waits is cut when the backend stops.
 */
@Injectable()
export class PageVersionScheduler implements OnModuleInit, BeforeApplicationShutdown {
  private readonly pending = new Map<string, PendingPageVersion>();
  private readonly running = new Set<Promise<void>>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    @Inject(BLOCK_COMMITS) private readonly feed: BlockCommitFeed,
    @Inject(PageBlockReader) private readonly owners: PageOwnerFinder,
    @Inject(PageVersionRepository) private readonly recorder: PageVersionRecorder,
    @Inject(PAGE_VERSION_CLOCK) private readonly clock: PageVersionClock,
    @Inject(PinoLogger) private readonly logger: PageVersionLogger,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.feed.subscribe((commit) => {
      this.schedule(commit);
    });
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.unsubscribe?.();
    for (const authorId of [...this.pending.keys()]) this.flush(authorId);
    await Promise.all([...this.running]);
  }

  private schedule({ blockIds, userId }: BlockCommit): void {
    const waiting = this.pending.get(userId);
    waiting?.cancelIdle();
    const cancelIdle = this.clock.after(PAGE_VERSION_IDLE_MS, () => {
      this.flush(userId);
    });
    const cancelMaxWait =
      waiting?.cancelMaxWait ??
      this.clock.after(PAGE_VERSION_MAX_WAIT_MS, () => {
        this.flush(userId);
      });
    this.pending.set(userId, {
      authorId: userId,
      blockIds: new Set([...(waiting?.blockIds ?? []), ...blockIds]),
      cancelIdle,
      cancelMaxWait,
    });
  }

  private flush(authorId: string): void {
    const waiting = this.pending.get(authorId);
    if (waiting === undefined) return;
    waiting.cancelIdle();
    waiting.cancelMaxWait();
    this.pending.delete(authorId);
    const work = this.cutVersions(waiting).finally(() => {
      this.running.delete(work);
    });
    this.running.add(work);
  }

  /** A failure is logged and does not stop the other pages: the next stretch of editing cuts its own version. */
  private async cutVersions({ authorId, blockIds }: PendingPageVersion): Promise<void> {
    try {
      const pageIds = await this.owners.findOwningPageIds([...blockIds]);
      for (const pageId of pageIds) await this.cutOne(pageId, authorId);
    } catch (error) {
      this.logger.error({ authorId, err: error }, 'the pages written by the editor could not be found for a version');
    }
  }

  private async cutOne(pageId: string, authorId: string): Promise<void> {
    try {
      await this.recorder.record(pageId, authorId);
    } catch (error) {
      this.logger.error({ authorId, err: error, pageId }, 'a version of a page written by the editor was not cut');
    }
  }
}
