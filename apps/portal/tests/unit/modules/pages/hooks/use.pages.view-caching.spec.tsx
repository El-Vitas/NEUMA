import { describe, expect, it, mock } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '@/modules/pages/collections/constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_CACHE_CONTEXT } from '@/modules/pages/collections/constants/pages.view-cache.context.constants';
import { buildViewCacheKey } from '@/modules/pages/collections/lib/pages.view-cache.lib';
import type { PagesCollectionNotices } from '@/modules/pages/collections/types/pages.collection-live.types';
import type { PageRow, PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import type {
  CachedRowBody,
  PagesCollectionCacheSession,
  PagesViewCachingInput,
} from '@/modules/pages/collections/types/pages.view-cache.types';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { createOutbox } from '@/modules/pages/local-cache/lib/local-cache.outbox.lib';
import { openLocalCache } from '@/modules/pages/local-cache/lib/local-cache.store.lib';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';
import { buildView } from '../lib/pages.views.fixture';

const revokedCalls: unknown[] = [];
let revokedAnswer: readonly string[] = [];

mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('view=Board&q=ana') }));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  readRevokedRowsAction: async (rows: unknown) => {
    revokedCalls.push(rows);
    return { data: revokedAnswer };
  },
}));

const { usePagesViewCaching } = await import('@/modules/pages/collections/hooks/use.pages.view-caching');

const properties: readonly PageSchemaProperty[] = [
  { config: defaultConfig, key: 'title', label: 'Title', options: null, required: false, type: 'TITLE' },
  {
    config: defaultConfig,
    key: 'status',
    label: 'Status',
    options: asPropertyOptions('todo', 'done'),
    required: false,
    type: 'SELECT',
  },
  { config: defaultConfig, key: 'total', label: 'Total', options: null, required: false, type: 'FORMULA' },
];

const view = buildView('Board', 'BOARD', { configuration: { groupBy: 'status' } });
const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [view] };

const rowOf = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues: { status: 'todo', total: 9 },
  spaceId: 'space-1',
  title: id,
  version: 14,
});

const openSession = async (): Promise<PagesCollectionCacheSession> => {
  const bundle = createMemoryStorage<CachedRowBody>();
  const cache = await openLocalCache({
    budgetBytes: 1_000_000,
    now: Date.now,
    storage: bundle.cache,
    userId: 'user-1',
  });
  return {
    cache,
    isPersistent: false,
    outbox: createOutbox({ now: Date.now, storage: bundle.outbox }),
    userId: 'user-1',
  };
};

const aggregates = Promise.resolve({
  calculations: {},
  distinctRowCount: 7,
  groupCalculations: {},
  groupCounts: {},
});

const outcome = {
  groups: [{ color: null, key: 'todo', label: 'todo', nextCursor: null, rows: [rowOf('a')] }],
  kind: 'GROUPED_ROWS',
} as const;

const input: PagesViewCachingInput = {
  aggregates,
  changesCursor: 'cursor-9',
  lookups: { attachedFiles: [], people: [], relatedRows: [] },
  outcome,
  pageId: 'collection-1',
  personOptions: [],
  schema,
  view,
  viewerId: 'user-1',
};

describe('usePagesViewCaching', () => {
  it('keeps the view under the question the address asks, with the cursor to continue from and the count', async () => {
    const session = await openSession();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_CACHE_CONTEXT value={session}>{children}</PAGE_COLLECTION_CACHE_CONTEXT>
    );

    renderHook(() => usePagesViewCaching(input), { wrapper });

    const key = buildViewCacheKey({
      day: null,
      filter: null,
      month: null,
      pageId: 'collection-1',
      search: 'ana',
      viewName: 'Board',
    });
    await waitFor(() => expect(session.cache.readResult(key)).not.toBeNull());
    const kept = session.cache.readResult(key);
    expect(kept?.result.changesCursor).toBe('cursor-9');
    expect(kept?.result.total).toBe(7);
    expect(kept?.result.ids).toEqual(['a']);
  });

  it('keeps each row under the version of its block that the server sent', async () => {
    const session = await openSession();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_CACHE_CONTEXT value={session}>{children}</PAGE_COLLECTION_CACHE_CONTEXT>
    );

    renderHook(() => usePagesViewCaching(input), { wrapper });

    await waitFor(() => expect(session.cache.readRecord('a')).not.toBeNull());
    expect(session.cache.readRecord('a')?.version).toBe(14);
  });

  it('keeps no computed value, which is worked out again on every read', async () => {
    const session = await openSession();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_CACHE_CONTEXT value={session}>{children}</PAGE_COLLECTION_CACHE_CONTEXT>
    );

    renderHook(() => usePagesViewCaching(input), { wrapper });

    await waitFor(() => expect(session.cache.readRecord('a')).not.toBeNull());
    expect(session.cache.readRecord('a')?.row.propertyValues).toEqual({ status: 'todo' });
  });

  it('forgets the rows of the collection at once when the reader loses it', async () => {
    const session = await openSession();
    const staleReaders = new Set<(cause: string) => void>();
    const notices: PagesCollectionNotices = {
      dispatch: () => undefined,
      requestRefresh: () => undefined,
      subscribe: () => () => undefined,
      subscribeStale: (listener) => {
        staleReaders.add(listener);
        return () => staleReaders.delete(listener);
      },
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_NOTICES_CONTEXT value={notices}>
        <PAGE_COLLECTION_CACHE_CONTEXT value={session}>{children}</PAGE_COLLECTION_CACHE_CONTEXT>
      </PAGE_COLLECTION_NOTICES_CONTEXT>
    );
    renderHook(() => usePagesViewCaching(input), { wrapper });
    await waitFor(() => expect(session.cache.readRecord('a')).not.toBeNull());

    for (const reader of staleReaders) reader('collection-revoked');

    await waitFor(() => expect(session.cache.readRecord('a')).toBeNull());
  });

  it('asks the server about the rows a fresh read stopped citing, and forgets the ones it says are closed', async () => {
    const session = await openSession();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_CACHE_CONTEXT value={session}>{children}</PAGE_COLLECTION_CACHE_CONTEXT>
    );
    const both: PagesViewCachingInput['outcome'] = {
      groups: [{ color: null, key: 'todo', label: 'todo', nextCursor: null, rows: [rowOf('a'), rowOf('b')] }],
      kind: 'GROUPED_ROWS',
    };
    revokedAnswer = ['b'];
    const view = renderHook(({ current }) => usePagesViewCaching(current), {
      initialProps: { current: { ...input, outcome: both } },
      wrapper,
    });
    await waitFor(() => expect(session.cache.readRecord('b')).not.toBeNull());

    view.rerender({ current: { ...input, outcome } });

    await waitFor(() => expect(session.cache.readRecord('b')).toBeNull());
    expect(revokedCalls).toEqual([{ rows: [{ id: 'b', version: 14 }] }]);
    expect(session.cache.readRecord('a')).not.toBeNull();
  });
});
