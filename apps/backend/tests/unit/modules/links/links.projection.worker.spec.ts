import { describe, expect, test } from 'bun:test';
import type { OutboxDeliveryRecord } from '@/common/types/outbox.types';
import { LinksProjectionWorker } from '@/modules/links/infrastructure/worker/links.projection.worker';
import type {
  LinksProjectionPage,
  LinksProjectionSource,
  PageLinkProjection,
  PageLinkReconciliationInput,
} from '@/modules/links/types/links.types';

const event = (overrides: Partial<OutboxDeliveryRecord> = {}): OutboxDeliveryRecord => ({
  aggregateId: 'page-source',
  aggregateType: 'PAGE',
  attemptCount: 1,
  deliveryId: 'event-1',
  eventType: 'PAGE_UPDATED',
  idempotencyKey: 'page:page-source:version:2',
  payload: { pageId: 'page-source', version: 2 },
  payloadVersion: 1,
  ...overrides,
});

type OutboxStubOverrides = Partial<{
  readonly markFailed: (id: string) => Promise<void>;
  readonly markProcessed: (id: string) => Promise<void>;
  readonly markRetryable: (id: string) => Promise<void>;
}>;

const createOutboxStub = (
  claimPending: () => Promise<readonly OutboxDeliveryRecord[]>,
  overrides: OutboxStubOverrides = {},
) => ({
  claimPending,
  markFailed: (): Promise<void> => Promise.resolve(),
  markProcessed: (): Promise<void> => Promise.resolve(),
  markRetryable: (): Promise<void> => Promise.resolve(),
  ...overrides,
});

const createSourceStub = (overrides: Partial<LinksProjectionSource> = {}): LinksProjectionSource => ({
  findPage: () => Promise.resolve(null),
  ...overrides,
});

const createProjectionStub = (overrides: Partial<PageLinkProjection> = {}): PageLinkProjection => ({
  reconcileLinks: () => Promise.resolve(),
  ...overrides,
});

const contentReferencing = (...pageIds: readonly string[]): LinksProjectionPage['content'] => ({
  content: [
    {
      content: pageIds.map((pageId) => ({
        attrs: { label: pageId, pageId, spaceId: 'space-a' },
        type: 'mention' as const,
      })),
      type: 'paragraph',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
});

describe('LinksProjectionWorker', () => {
  test('reconciles the current mentions of a page updated event', async () => {
    const reconciled: PageLinkReconciliationInput[] = [];
    const page: LinksProjectionPage = {
      content: contentReferencing('page-a', 'page-b'),
      id: 'page-source',
      lifecycle: 'ACTIVE',
    };
    const outbox = createOutboxStub(() => Promise.resolve([event()]));
    const source = createSourceStub({ findPage: () => Promise.resolve(page) });
    const projection = createProjectionStub({
      reconcileLinks: (input) => {
        reconciled.push(input);
        return Promise.resolve();
      },
    });
    const worker = new LinksProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(reconciled).toEqual([{ sourcePageId: 'page-source', targetPageIds: ['page-a', 'page-b'] }]);
  });

  test('reconciles an empty target set when the page is trashed, removing its outgoing links', async () => {
    const reconciled: PageLinkReconciliationInput[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event({ eventType: 'PAGE_TRASHED' })]));
    const source = createSourceStub({
      findPage: () =>
        Promise.resolve({
          content: contentReferencing('page-a'),
          id: 'page-source',
          lifecycle: 'TRASHED',
        }),
    });
    const projection = createProjectionStub({
      reconcileLinks: (input) => {
        reconciled.push(input);
        return Promise.resolve();
      },
    });
    const worker = new LinksProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(reconciled).toEqual([{ sourcePageId: 'page-source', targetPageIds: [] }]);
  });

  test('reconciles an empty target set when the page no longer exists', async () => {
    const reconciled: PageLinkReconciliationInput[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event()]));
    const source = createSourceStub({ findPage: () => Promise.resolve(null) });
    const projection = createProjectionStub({
      reconcileLinks: (input) => {
        reconciled.push(input);
        return Promise.resolve();
      },
    });
    const worker = new LinksProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(reconciled).toEqual([{ sourcePageId: 'page-source', targetPageIds: [] }]);
  });

  test('skips the event without reconciling when the stored content fails to parse', async () => {
    const reconciled: PageLinkReconciliationInput[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event()]));
    const source = createSourceStub({
      findPage: () =>
        Promise.resolve({ content: { not: 'valid page content' }, id: 'page-source', lifecycle: 'ACTIVE' }),
    });
    const projection = createProjectionStub({
      reconcileLinks: (input) => {
        reconciled.push(input);
        return Promise.resolve();
      },
    });
    const worker = new LinksProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(reconciled).toEqual([]);
  });

  test('ignores events for aggregates other than PAGE', async () => {
    const reconciled: PageLinkReconciliationInput[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event({ aggregateType: 'DATABASE' })]));
    const source = createSourceStub();
    const projection = createProjectionStub({
      reconcileLinks: (input) => {
        reconciled.push(input);
        return Promise.resolve();
      },
    });
    const worker = new LinksProjectionWorker(outbox, source, projection);

    await worker.processBatch(10);

    expect(reconciled).toEqual([]);
  });

  test('marks a failed event retryable while under the attempt limit', async () => {
    const marks: string[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event()]), {
      markRetryable: (id: string): Promise<void> => {
        marks.push(`retry:${id}`);
        return Promise.resolve();
      },
    });
    const source = createSourceStub({ findPage: () => Promise.reject(new Error('database unavailable')) });
    const worker = new LinksProjectionWorker(outbox, source, createProjectionStub());

    await worker.processBatch(10);

    expect(marks).toEqual(['retry:event-1']);
  });

  test('marks an event permanently failed once the attempt limit is reached', async () => {
    const marks: string[] = [];
    const outbox = createOutboxStub(() => Promise.resolve([event({ attemptCount: 5 })]), {
      markFailed: (id: string): Promise<void> => {
        marks.push(`failed:${id}`);
        return Promise.resolve();
      },
    });
    const source = createSourceStub({ findPage: () => Promise.reject(new Error('database unavailable')) });
    const worker = new LinksProjectionWorker(outbox, source, createProjectionStub());

    await worker.processBatch(10);

    expect(marks).toEqual(['failed:event-1']);
  });
});
