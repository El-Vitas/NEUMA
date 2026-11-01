import { type BeforeApplicationShutdown, Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BLOCK_COMMITS } from '../../../../common/constants/block-writer.constants';
import type { BlockCommit, BlockCommitFeed } from '../../../../common/types/block-writer.types';
import { TextMentionService } from '../../text-mention.service';

/** Follows the commits of the blocks module. Notifying never holds up or fails a write: errors are logged. */
@Injectable()
export class TextMentionListener implements OnModuleInit, BeforeApplicationShutdown {
  private readonly running = new Set<Promise<void>>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    @Inject(BLOCK_COMMITS) private readonly feed: BlockCommitFeed,
    private readonly textMentionService: TextMentionService,
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.feed.subscribe((commit) => {
      this.track(this.notify(commit));
    });
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.unsubscribe?.();
    await Promise.all([...this.running]);
  }

  private track(work: Promise<void>): void {
    this.running.add(work);
    void work.finally(() => this.running.delete(work));
  }

  private async notify(commit: BlockCommit): Promise<void> {
    try {
      await this.textMentionService.notifyAfterCommit(commit);
    } catch (error) {
      this.logger.error({ err: error }, 'could not notify the people mentioned in committed text');
    }
  }
}
