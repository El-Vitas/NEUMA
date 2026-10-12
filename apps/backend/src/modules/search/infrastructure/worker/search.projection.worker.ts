import { Inject, Injectable } from '@nestjs/common';
import { type JsonValue, PageLifecycle, SearchSourceType } from '@neuma/db';
import { listPageBlocks, readStoredPageContent } from '@neuma/shared';
import { parseStoredPageIcon } from '../../../../common/domain/page-icon.domain';
import { OutboxProjectionWorker } from '../../../../common/infrastructure/worker/outbox-projection.worker';
import type { OutboxProjectionEvent, OutboxProjectionOutbox } from '../../../../common/types/outbox.types';
import { SEARCH_MAX_VERSION_MARKER, SEARCH_OUTBOX_MAX_ATTEMPTS } from '../../constants/search.constants';
import {
  SEARCH_PROJECTION_OUTBOX as SEARCH_PROJECTION_OUTBOX_TOKEN,
  SEARCH_PROJECTION_SOURCE as SEARCH_PROJECTION_SOURCE_TOKEN,
} from '../../constants/search.tokens';
import { SearchService } from '../../search.service';
import type {
  SearchDocumentInput,
  SearchDocumentProjection,
  SearchDocumentRemoval,
  SearchProjectionPage,
  SearchProjectionSource,
} from '../../types/search.types';
import { extractPageContentText } from '../../utils/search.content.utils';

const toPageProjection = (page: {
  authorId: string;
  authorName: string | null;
  content: unknown;
  icon: JsonValue;
  id: string;
  parentPageId: string | null;
  parentPageTitle: string | null;
  spaceId: string;
  spaceName: string;
  title: string;
  updatedAt: Date;
  verificationExpiresAt: Date | null;
  verifiedAt: Date | null;
  version: number;
}): SearchDocumentInput | null => {
  const content = readStoredPageContent(page.content);
  if (content === null) return null;
  return {
    contentType: 'PAGE',
    editedAt: page.updatedAt,
    extractedText: extractPageContentText(content),
    language: null,
    properties: {
      authorId: page.authorId,
      authorName: page.authorName,
      icon: parseStoredPageIcon(page.icon),
      parentPageId: page.parentPageId,
      parentPageTitle: page.parentPageTitle,
      spaceName: page.spaceName,
      verificationExpiresAt: page.verificationExpiresAt?.toISOString() ?? null,
      verifiedAt: page.verifiedAt?.toISOString() ?? null,
    },
    sourceId: page.id,
    sourceType: SearchSourceType.PAGE,
    spaceId: page.spaceId,
    tags: [],
    title: page.title,
    versionMarker: page.version,
  };
};

const readPayloadObject = (event: OutboxProjectionEvent): Record<string, string | number> => {
  if (typeof event.payload !== 'object' || event.payload === null || Array.isArray(event.payload)) return {};
  const payload: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(event.payload)) {
    if (typeof value === 'string' || typeof value === 'number') payload[key] = value;
  }
  return payload;
};

const readVersionMarker = (event: OutboxProjectionEvent): number => {
  const payload = readPayloadObject(event);
  return typeof payload.version === 'number' && Number.isSafeInteger(payload.version)
    ? payload.version
    : SEARCH_MAX_VERSION_MARKER;
};

@Injectable()
export class SearchProjectionWorker extends OutboxProjectionWorker {
  constructor(
    @Inject(SEARCH_PROJECTION_OUTBOX_TOKEN) outbox: OutboxProjectionOutbox,
    @Inject(SEARCH_PROJECTION_SOURCE_TOKEN) private readonly source: SearchProjectionSource,
    @Inject(SearchService) private readonly projection: SearchDocumentProjection,
  ) {
    super(outbox, SEARCH_OUTBOX_MAX_ATTEMPTS);
  }

  protected async projectEvent(event: OutboxProjectionEvent): Promise<void> {
    if (event.aggregateType !== 'PAGE') return;
    const page = await this.source.findPage(event.aggregateId);
    if (page?.lifecycle !== PageLifecycle.ACTIVE) {
      await this.forgetPage(event.aggregateId, page?.version ?? readVersionMarker(event));
      return;
    }
    await this.projectPage(page);
  }

  /** Content that cannot be read is not projected. */
  private async projectPage(page: SearchProjectionPage): Promise<void> {
    const content = readStoredPageContent(page.content);
    const input = toPageProjection(page);
    if (content === null || input === null) return;
    await this.projection.applyProjection(input);
    await this.projection.applyBlocksProjection({
      blocks: listPageBlocks(content),
      pageId: page.id,
      pageVersion: page.version,
      spaceId: page.spaceId,
    });
  }

  private async forgetPage(pageId: string, version: number): Promise<void> {
    await this.projection.removeProjection(toRemoval(SearchSourceType.PAGE, pageId, version));
    await this.projection.removeBlocksProjection({ pageId, pageVersion: version });
  }
}

const toRemoval = (sourceType: SearchSourceType, sourceId: string, versionMarker: number): SearchDocumentRemoval => ({
  sourceId,
  sourceType,
  versionMarker,
});
