import { Inject, Injectable } from '@nestjs/common';
import { PageLifecycle } from '@neuma/db';
import { OutboxProjectionWorker } from '../../../../common/infrastructure/worker/outbox-projection.worker';
import type { OutboxProjectionEvent, OutboxProjectionOutbox } from '../../../../common/types/outbox.types';
import { LINKS_OUTBOX_MAX_ATTEMPTS } from '../../constants/links.constants';
import { LINKS_PROJECTION_OUTBOX, LINKS_PROJECTION_SOURCE } from '../../constants/links.tokens';
import { resolveLinkTargets } from '../../domain/page-link.domain';
import { LinksService } from '../../links.service';
import type { LinksProjectionPage, LinksProjectionSource, PageLinkProjection } from '../../types/links.types';
import { extractLinkTargetPageIds } from '../../utils/links.content.utils';

const resolveTargetPageIds = (sourcePageId: string, page: LinksProjectionPage | null): readonly string[] | null => {
  if (page?.lifecycle !== PageLifecycle.ACTIVE) return [];
  const mentionedPageIds = extractLinkTargetPageIds(page.content);
  return mentionedPageIds === null ? null : resolveLinkTargets(sourcePageId, mentionedPageIds);
};

@Injectable()
export class LinksProjectionWorker extends OutboxProjectionWorker {
  constructor(
    @Inject(LINKS_PROJECTION_OUTBOX) outbox: OutboxProjectionOutbox,
    @Inject(LINKS_PROJECTION_SOURCE) private readonly source: LinksProjectionSource,
    @Inject(LinksService) private readonly projection: PageLinkProjection,
  ) {
    super(outbox, LINKS_OUTBOX_MAX_ATTEMPTS);
  }

  protected async projectEvent(event: OutboxProjectionEvent): Promise<void> {
    if (event.aggregateType !== 'PAGE') return;
    const page = await this.source.findPage(event.aggregateId);
    const targetPageIds = resolveTargetPageIds(event.aggregateId, page);
    if (targetPageIds === null) return;
    await this.projection.reconcileLinks({ sourcePageId: event.aggregateId, targetPageIds });
  }
}
