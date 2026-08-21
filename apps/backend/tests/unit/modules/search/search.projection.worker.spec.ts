import { describe, expect, test } from 'bun:test';
import type { OutboxEventRecord } from '@/common/types/outbox.types';
import { SEARCH_MAX_VERSION_MARKER } from '@/modules/search/constants/search.constants';
import { SearchProjectionWorker } from '@/modules/search/infrastructure/worker/search.projection.worker';
import type {
  SearchDocumentInput,
  SearchDocumentProjection,
  SearchDocumentRemoval,
  SearchProjectionPage,
  SearchProjectionSource,
} from '@/modules/search/types/search.types';

const activePage: SearchProjectionPage = {
  authorId: 'user-1',
  authorName: 'Ada Lovelace',
  content: {
    content: [{ content: [{ text: 'Prepare launch', type: 'text' }], type: 'paragraph' }],
    schemaVersion: 1,
    type: 'doc',
  },
  icon: null,
  id: 'page-1',
  lifecycle: 'ACTIVE',
  parentPageId: null,
  parentPageTitle: null,
  spaceId: 'space-1',
  spaceName: 'Mission Control',
  title: 'Launch plan',
  verificationExpiresAt: null,
  verifiedAt: null,
  version: 12,
};

const event = (overrides: Partial<OutboxEventRecord> = {}): OutboxEventRecord => ({
  aggregateId: 'page-1',
  aggregateType: 'PAGE',
  attemptCount: 1,
  eventType: 'PAGE_UPDATED',
  id: 'event-1',
  idempotencyKey: 'page:page-1:version:12',
  payload: { pageId: 'page-1', version: 12 },
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
  ...overrides,
});

const createProjectionStub = (overrides: Partial<SearchDocumentProjection> = {}): SearchDocumentProjection => ({
  applyProjection: () => Promise.resolve(),
  removeProjection: () => Promise.resolve(),
  ...overrides,
});

const createFailingWorker = (outbox: ReturnType<typeof createOutboxStub>): SearchProjectionWorker => {
  const source = createSourceStub({ findPage: () => Promise.reject(new Error('database unavailable')) });
  return new SearchProjectionWorker(outbox, source, createProjectionStub());
};

const createWorker = (events: readonly OutboxEventRecord[]) => {
  const applied: SearchDocumentInput[] = [];
  const outbox = createOutboxStub(() => Promise.resolve(events));
  const source = createSourceStub({ findPage: () => Promise.resolve(activePage) });
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
      authorId: 'user-1',
      authorName: 'Ada Lovelace',
      content: {
        content: [{ content: [{ text: 'Current body', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      },
      icon: null,
      id: 'page-1',
      lifecycle: 'ACTIVE',
      parentPageId: 'page-parent',
      parentPageTitle: 'Missions',
      spaceId: 'space-1',
      spaceName: 'Mission Control',
      title: 'Current title',
      verificationExpiresAt: null,
      verifiedAt: null,
      version: 12,
    };
    const outbox = createOutboxStub(() =>
      Promise.resolve([
        event({
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

  test('projects the current page with its searchable metadata', async () => {
    const { applied, worker } = createWorker([event()]);

    await worker.processBatch(10);

    expect(applied).toEqual([
      {
        contentType: 'PAGE',
        extractedText: 'Prepare launch',
        language: null,
        properties: {
          authorId: 'user-1',
          authorName: 'Ada Lovelace',
          icon: null,
          parentPageId: null,
          parentPageTitle: null,
          spaceName: 'Mission Control',
          verificationExpiresAt: null,
          verifiedAt: null,
        },
        sourceId: 'page-1',
        sourceType: 'PAGE',
        spaceId: 'space-1',
        tags: [],
        title: 'Launch plan',
        versionMarker: 12,
      },
    ]);
  });

  test('carries the verification stamp into the properties the index filters on', async () => {
    const verifiedPage: SearchProjectionPage = {
      ...activePage,
      verificationExpiresAt: new Date('2026-09-01T00:00:00.000Z'),
      verifiedAt: new Date('2026-06-01T00:00:00.000Z'),
    };
    const applied: SearchDocumentInput[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event()]));
    const source = createSourceStub({ findPage: () => Promise.resolve(verifiedPage) });
    const projection = createProjectionStub({
      applyProjection: (input): Promise<void> => {
        applied.push(input);
        return Promise.resolve();
      },
    });
    const worker = new SearchProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(applied[0]?.properties).toMatchObject({
      verificationExpiresAt: '2026-09-01T00:00:00.000Z',
      verifiedAt: '2026-06-01T00:00:00.000Z',
    });
  });

  test('projects the space name and parent page found alongside the page itself', async () => {
    const applied: SearchDocumentInput[] = [];
    const page: SearchProjectionPage = {
      authorId: 'user-1',
      authorName: 'Ada Lovelace',
      content: {
        content: [{ content: [{ text: 'Mission checklist', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      },
      icon: { kind: 'emoji', value: '🚀' },
      id: 'page-2',
      lifecycle: 'ACTIVE',
      parentPageId: 'page-1',
      parentPageTitle: 'Launch plan',
      spaceId: 'space-1',
      spaceName: 'Mission Control',
      title: 'Checklist',
      verificationExpiresAt: null,
      verifiedAt: null,
      version: 1,
    };
    const outbox = createOutboxStub(() => Promise.resolve([event({ aggregateId: 'page-2' })]));
    const source = createSourceStub({ findPage: () => Promise.resolve(page) });
    const projection = createProjectionStub({
      applyProjection: (input) => {
        applied.push(input);
        return Promise.resolve();
      },
    });
    const worker = new SearchProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(applied[0]?.properties).toEqual({
      authorId: 'user-1',
      authorName: 'Ada Lovelace',
      icon: { kind: 'emoji', value: '🚀' },
      parentPageId: 'page-1',
      parentPageTitle: 'Launch plan',
      spaceName: 'Mission Control',
      verificationExpiresAt: null,
      verifiedAt: null,
    });
  });

  test('does not use process memory as the idempotency source of truth', async () => {
    const { applied, worker } = createWorker([event(), event({ id: 'event-2' })]);

    await worker.processBatch(10);

    expect(applied).toHaveLength(2);
  });

  test('removes an inactive page projection instead of keeping it searchable', async () => {
    const removals: SearchDocumentRemoval[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event({ eventType: 'PAGE_TRASHED' })]));
    const source = createSourceStub({
      findPage: () =>
        Promise.resolve({
          authorId: 'user-1',
          authorName: 'Ada Lovelace',
          content: {},
          icon: null,
          id: 'page-1',
          lifecycle: 'TRASHED',
          parentPageId: null,
          parentPageTitle: null,
          spaceId: 'space-1',
          spaceName: 'Mission Control',
          title: 'Deleted page',
          verificationExpiresAt: null,
          verifiedAt: null,
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

  test('ignores an event for an aggregate the search projection does not own', async () => {
    const applied: SearchDocumentInput[] = [];
    const outbox = createOutboxStub(() =>
      Promise.resolve([event({ aggregateId: 'space-1', aggregateType: 'SPACE', eventType: 'SPACE_UPDATED' })]),
    );
    const source = createSourceStub({ findPage: () => Promise.resolve(activePage) });
    const projection = createProjectionStub({
      applyProjection: (input) => {
        applied.push(input);
        return Promise.resolve();
      },
    });
    const worker = new SearchProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(applied).toEqual([]);
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
    const worker = createFailingWorker(outbox);

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
    const worker = createFailingWorker(outbox);

    await worker.processBatch(10);

    expect(failed).toEqual(['event-1']);
  });

  test('asks to forget a page that no longer exists with a marker the store can hold', async () => {
    const removals: SearchDocumentRemoval[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event({ eventType: 'PAGE_TRASHED' })]));
    const source = createSourceStub({ findPage: () => Promise.resolve(null) });
    const projection = createProjectionStub({
      removeProjection: (input) => {
        removals.push(input);
        return Promise.resolve();
      },
    });
    const worker = new SearchProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(removals[0]?.versionMarker).toBeLessThanOrEqual(SEARCH_MAX_VERSION_MARKER);
  });
});
