import { PageLifecycle, SearchSourceType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { readStoredPageContent } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
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
  SearchProjectionSource,
} from '../../types/search.types';
import { extractPageContentText } from '../../utils/search.content.utils';

const toPageProjection = (page: {
  authorId: string;
  authorName: string | null;
  content: unknown;
  icon: Prisma.JsonValue;
  id: string;
  parentPageId: string | null;
  parentPageTitle: string | null;
  spaceId: string;
  spaceName: string;
  title: string;
  version: number;
}): SearchDocumentInput | null => {
  const content = readStoredPageContent(page.content);
  if (content === null) return null;
  return {
    contentType: 'PAGE',
    extractedText: extractPageContentText(content),
    language: null,
    properties: {
      authorId: page.authorId,
      authorName: page.authorName,
      icon: parseStoredPageIcon(page.icon),
      parentPageId: page.parentPageId,
      parentPageTitle: page.parentPageTitle,
      spaceName: page.spaceName,
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
    if (event.aggregateType === 'PAGE') {
      const page = await this.source.findPage(event.aggregateId);
      if (page?.lifecycle !== PageLifecycle.ACTIVE) {
        await this.projection.removeProjection(
          toRemoval(SearchSourceType.PAGE, event.aggregateId, page?.version ?? readVersionMarker(event)),
        );
        return;
      }
      const input = toPageProjection(page);
      if (input !== null) await this.projection.applyProjection(input);
    }
  }
}

const toRemoval = (sourceType: SearchSourceType, sourceId: string, versionMarker: number): SearchDocumentRemoval => ({
  sourceId,
  sourceType,
  versionMarker,
});
