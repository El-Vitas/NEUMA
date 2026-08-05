import { DatabaseLifecycle, PageLifecycle, SearchSourceType } from '@company-brain/db';
import { pageContentSchema } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { OutboxProjectionWorker } from '../../../../common/infrastructure/worker/outbox-projection.worker';
import type { OutboxProjectionEvent, OutboxProjectionOutbox } from '../../../../common/types/outbox.types';
import { SEARCH_OUTBOX_MAX_ATTEMPTS } from '../../constants/search.constants';
import {
  SEARCH_PROJECTION_OUTBOX as SEARCH_PROJECTION_OUTBOX_TOKEN,
  SEARCH_PROJECTION_SOURCE as SEARCH_PROJECTION_SOURCE_TOKEN,
} from '../../constants/search.tokens';
import { SearchService } from '../../search.service';
import type {
  SearchDocumentInput,
  SearchDocumentProjection,
  SearchDocumentRemoval,
  SearchProjectionRecord,
  SearchProjectionSource,
} from '../../types/search.types';
import { extractPageContentText } from '../../utils/search.content.utils';

const toPropertyValues = (
  record: SearchProjectionRecord,
): Record<string, string | number | boolean | readonly string[]> => {
  if (
    typeof record.propertyValues !== 'object' ||
    record.propertyValues === null ||
    Array.isArray(record.propertyValues)
  )
    return {};
  const values: Record<string, string | number | boolean | readonly string[]> = {};
  for (const property of record.database.properties) {
    const value = record.propertyValues[property.key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      values[property.key] = value;
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) values[property.key] = value;
  }
  return values;
};

const toRecordProjection = (record: SearchProjectionRecord): SearchDocumentInput => {
  const properties = toPropertyValues(record);
  const contentType = getContentType(record.database.template);
  return {
    contentType,
    extractedText: Object.entries(properties)
      .flatMap(([, value]) => toPropertyText(value))
      .join(' '),
    language: null,
    properties,
    sourceId: record.id,
    sourceType: SearchSourceType.DATABASE_RECORD,
    spaceId: record.database.spaceId,
    tags: [],
    title: record.title,
    versionMarker: record.version,
  };
};

const toPropertyText = (value: string | number | boolean | readonly string[]): readonly string[] => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  return value.map((item) => item);
};

const getContentType = (template: string): string => {
  if (template === 'TASKS') return 'TASK';
  if (template === 'PROJECTS') return 'PROJECT';
  return 'DATABASE_RECORD';
};

const toPageProjection = (page: {
  content: unknown;
  id: string;
  spaceId: string;
  title: string;
  version: number;
}): SearchDocumentInput | null => {
  const content = pageContentSchema.safeParse(page.content);
  if (!content.success) return null;
  return {
    contentType: 'PAGE',
    extractedText: extractPageContentText(content.data),
    language: null,
    properties: {},
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
    : Number.MAX_SAFE_INTEGER;
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
      if (page === null || page.lifecycle !== PageLifecycle.ACTIVE) {
        await this.projection.removeProjection(
          toRemoval(SearchSourceType.PAGE, event.aggregateId, page?.version ?? readVersionMarker(event)),
        );
        return;
      }
      const input = toPageProjection(page);
      if (input !== null) await this.projection.applyProjection(input);
      return;
    }
    if (event.aggregateType === 'DATABASE') {
      const payload = readPayloadObject(event);
      const records = await this.source.listRecords(String(payload.databaseId ?? event.aggregateId));
      for (const record of records) await this.projectRecord(record, record.id);
      return;
    }
    if (event.aggregateType !== 'DATABASE_RECORD') return;
    const record = await this.source.findRecord(event.aggregateId);
    await this.projectRecord(record, event.aggregateId, readVersionMarker(event));
  }

  private async projectRecord(
    record: SearchProjectionRecord | null,
    sourceId: string,
    eventVersionMarker: number = Number.MAX_SAFE_INTEGER,
  ): Promise<void> {
    if (
      record === null ||
      record.lifecycle !== DatabaseLifecycle.ACTIVE ||
      record.database.lifecycle !== DatabaseLifecycle.ACTIVE
    ) {
      await this.projection.removeProjection(
        toRemoval(SearchSourceType.DATABASE_RECORD, sourceId, record?.version ?? eventVersionMarker),
      );
      return;
    }
    await this.projection.applyProjection(toRecordProjection(record));
  }
}

const toRemoval = (sourceType: SearchSourceType, sourceId: string, versionMarker: number): SearchDocumentRemoval => ({
  sourceId,
  sourceType,
  versionMarker,
});
