import { describe, expect, test } from 'bun:test';
import type { OutboxEventRecord } from '@/common/types/outbox.types';
import { SearchProjectionWorker } from '@/modules/search/infrastructure/worker/search.projection.worker';
import type {
  SearchDocumentInput,
  SearchDocumentProjection,
  SearchDocumentRemoval,
  SearchProjectionPage,
  SearchProjectionRecord,
  SearchProjectionSource,
} from '@/modules/search/types/search.types';

const record: SearchProjectionRecord = {
  database: {
    lifecycle: 'ACTIVE',
    name: 'Tasks',
    properties: [
      { key: 'status', label: 'Status', type: 'SELECT' },
      { key: 'description', label: 'Description', type: 'RICH_TEXT' },
    ],
    spaceId: 'space-1',
    template: 'TASKS',
  },
  databaseId: 'database-1',
  id: 'record-1',
  lifecycle: 'ACTIVE',
  propertyValues: { description: 'Prepare launch', status: 'todo' },
  title: 'Launch plan',
  version: 12,
};

const event = (overrides: Partial<OutboxEventRecord> = {}): OutboxEventRecord => ({
  aggregateId: 'record-1',
  aggregateType: 'DATABASE_RECORD',
  attemptCount: 1,
  eventType: 'DATABASE_RECORD_UPDATED',
  id: 'event-1',
  idempotencyKey: 'record:record-1:version:12',
  payload: { databaseId: 'database-1', recordId: 'record-1', version: 12 },
  payloadVersion: 1,
  ...overrides,
});

type OutboxStubOverrides = Partial<{
  readonly markFailed: (id: string) => Promise<void>;
  readonly markProcessed: (id: string) => Promise<void>;
  readonly markRetryable: (id: string) => Promise<void>;
}>;

const createOutboxStub = (
  claimPending: () => Promise<readonly OutboxEventRecord[]>,
  overrides: OutboxStubOverrides = {},
) => ({
  claimPending,
  markFailed: (): Promise<void> => Promise.resolve(),
  markProcessed: (): Promise<void> => Promise.resolve(),
  markRetryable: (): Promise<void> => Promise.resolve(),
  ...overrides,
});

const createSourceStub = (overrides: Partial<SearchProjectionSource> = {}): SearchProjectionSource => ({
  findPage: () => Promise.resolve(null),
  findRecord: () => Promise.resolve(null),
  listRecords: () => Promise.resolve([]),
  ...overrides,
});

const createProjectionStub = (overrides: Partial<SearchDocumentProjection> = {}): SearchDocumentProjection => ({
  applyProjection: () => Promise.resolve(),
  removeProjection: () => Promise.resolve(),
  ...overrides,
});

const createFailingRecordWorker = (outbox: ReturnType<typeof createOutboxStub>): SearchProjectionWorker => {
  const source = createSourceStub({ findRecord: () => Promise.reject(new Error('database unavailable')) });
  return new SearchProjectionWorker(outbox, source, createProjectionStub());
};

const createWorker = (events: readonly OutboxEventRecord[]) => {
  const applied: SearchDocumentInput[] = [];
  const outbox = createOutboxStub(() => Promise.resolve(events));
  const source = createSourceStub({ findRecord: () => Promise.resolve(record) });
  const projection = createProjectionStub({
    applyProjection: (input): Promise<void> => {
      applied.push(input);
      return Promise.resolve();
    },
  });
  const worker = new SearchProjectionWorker(outbox, source, projection);
  return { applied, worker };
};

describe('SearchProjectionWorker', () => {
  test('projects the current page version and ignores a stale event version', async () => {
    const applied: SearchDocumentInput[] = [];
    const page: SearchProjectionPage = {
      content: {
        content: [{ content: [{ text: 'Current body', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      },
      id: 'page-1',
      lifecycle: 'ACTIVE',
      spaceId: 'space-1',
      title: 'Current title',
      version: 12,
    };
    const outbox = createOutboxStub(() =>
      Promise.resolve([
        event({
          aggregateId: 'page-1',
          aggregateType: 'PAGE',
          eventType: 'PAGE_UPDATED',
          idempotencyKey: 'page:page-1:version:10',
          payload: { pageId: 'page-1', version: 10 },
        }),
      ]),
    );
    const source = createSourceStub({ findPage: () => Promise.resolve(page) });
    const projection = createProjectionStub({
      applyProjection: (input) => {
        applied.push(input);
        return Promise.resolve();
      },
    });
    const worker = new SearchProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(applied[0]?.versionMarker).toBe(12);
    expect(applied[0]?.extractedText).toBe('Current body');
  });

  test('projects the current database record with configured metadata', async () => {
    const { applied, worker } = createWorker([event()]);

    await worker.processBatch(10);

    expect(applied).toEqual([
      {
        contentType: 'TASK',
        extractedText: 'todo Prepare launch',
        language: null,
        properties: { description: 'Prepare launch', status: 'todo' },
        sourceId: 'record-1',
        sourceType: 'DATABASE_RECORD',
        spaceId: 'space-1',
        tags: [],
        title: 'Launch plan',
        versionMarker: 12,
      },
    ]);
  });

  test('does not use process memory as the idempotency source of truth', async () => {
    const { applied, worker } = createWorker([event(), event({ id: 'event-2' })]);

    await worker.processBatch(10);

    expect(applied).toHaveLength(2);
  });

  test('removes an inactive page projection instead of keeping it searchable', async () => {
    const removals: SearchDocumentRemoval[] = [];
    const outbox = createOutboxStub(() =>
      Promise.resolve([event({ aggregateId: 'page-1', aggregateType: 'PAGE', eventType: 'PAGE_TRASHED' })]),
    );
    const source = createSourceStub({
      findPage: () =>
        Promise.resolve({
          content: {},
          id: 'page-1',
          lifecycle: 'TRASHED',
          spaceId: 'space-1',
          title: 'Deleted page',
          version: 4,
        }),
    });
    const projection = createProjectionStub({
      removeProjection: (input) => {
        removals.push(input);
        return Promise.resolve();
      },
    });
    const worker = new SearchProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(removals).toEqual([{ sourceId: 'page-1', sourceType: 'PAGE', versionMarker: 4 }]);
  });

  test('keeps active records and removes records from archived databases', async () => {
    const applied: SearchDocumentInput[] = [];
    const removals: SearchDocumentRemoval[] = [];
    const archivedRecord: SearchProjectionRecord = {
      ...record,
      database: { ...record.database, lifecycle: 'ARCHIVED' },
      id: 'record-archived',
    };
    const outbox = createOutboxStub(() =>
      Promise.resolve([event({ aggregateId: 'database-1', aggregateType: 'DATABASE', eventType: 'DATABASE_UPDATED' })]),
    );
    const source = createSourceStub({ listRecords: () => Promise.resolve([record, archivedRecord]) });
    const projection = createProjectionStub({
      applyProjection: (input) => {
        applied.push(input);
        return Promise.resolve();
      },
      removeProjection: (input) => {
        removals.push(input);
        return Promise.resolve();
      },
    });
    const worker = new SearchProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(applied).toHaveLength(1);
    expect(removals).toEqual([{ sourceId: 'record-archived', sourceType: 'DATABASE_RECORD', versionMarker: 12 }]);
  });

  test('marks a failed event retryable with bounded attempts', async () => {
    const failed: string[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event()]), {
      markFailed: (id: string): Promise<void> => {
        failed.push(`failed:${id}`);
        return Promise.resolve();
      },
      markRetryable: (id: string): Promise<void> => {
        failed.push(`retry:${id}`);
        return Promise.resolve();
      },
    });
    const worker = createFailingRecordWorker(outbox);

    await worker.processBatch(10);

    expect(failed).toEqual(['retry:event-1']);
  });

  test('marks an event permanently failed at the attempt limit', async () => {
    const failed: string[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event({ attemptCount: 5 })]), {
      markFailed: (id: string): Promise<void> => {
        failed.push(id);
        return Promise.resolve();
      },
    });
    const worker = createFailingRecordWorker(outbox);

    await worker.processBatch(10);

    expect(failed).toEqual(['event-1']);
  });
});
