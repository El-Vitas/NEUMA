import { PageLifecycle } from '@company-brain/db';
import { Inject, Injectable } from '@nestjs/common';
import { LINKS_OUTBOX_MAX_ATTEMPTS } from '../../constants/links.constants';
import { LINKS_PROJECTION_OUTBOX, LINKS_PROJECTION_SOURCE } from '../../constants/links.tokens';
import { resolveLinkTargets } from '../../domain/page-link.domain';
import { LinksService } from '../../links.service';
import type {
  LinksProjectionOutbox,
  LinksProjectionPage,
  LinksProjectionSource,
  OutboxProjectionEvent,
  PageLinkProjection,
} from '../../types/links.types';
import { extractLinkTargetPageIds } from '../../utils/links.content.utils';

const resolveTargetPageIds = (sourcePageId: string, page: LinksProjectionPage | null): readonly string[] | null => {
  if (page === null || page.lifecycle !== PageLifecycle.ACTIVE) return [];
  const mentionedPageIds = extractLinkTargetPageIds(page.content);
  return mentionedPageIds === null ? null : resolveLinkTargets(sourcePageId, mentionedPageIds);
};

@Injectable()
export class LinksProjectionWorker {
  constructor(
    @Inject(LINKS_PROJECTION_OUTBOX) private readonly outbox: LinksProjectionOutbox,
    @Inject(LINKS_PROJECTION_SOURCE) private readonly source: LinksProjectionSource,
    @Inject(LinksService) private readonly projection: PageLinkProjection,
  ) {}

  async processBatch(limit: number): Promise<number> {
    const events = await this.outbox.claimPending(limit);
    for (const event of events) await this.processEvent(event);
    return events.length;
  }

  private async processEvent(event: OutboxProjectionEvent): Promise<void> {
    try {
      await this.projectEvent(event);
      await this.outbox.markProcessed(event.id);
    } catch (error) {
      if (event.attemptCount >= LINKS_OUTBOX_MAX_ATTEMPTS) await this.outbox.markFailed(event.id, error);
      else await this.outbox.markRetryable(event.id, error, event.attemptCount);
    }
  }

  private async projectEvent(event: OutboxProjectionEvent): Promise<void> {
    if (event.aggregateType !== 'PAGE') return;
    const page = await this.source.findPage(event.aggregateId);
    const targetPageIds = resolveTargetPageIds(event.aggregateId, page);
    if (targetPageIds === null) return;
    await this.projection.reconcileLinks({ sourcePageId: event.aggregateId, targetPageIds });
  }
}
