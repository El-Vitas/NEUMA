import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { PAGE_COLLECTION_CACHE_CONTEXT } from '@/modules/pages/collections/constants/pages.view-cache.context.constants';
import { buildViewCacheKey, toCachedView } from '@/modules/pages/collections/lib/pages.view-cache.lib';
import type { PageRow, PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import type {
  CachedRowBody,
  PagesCollectionCacheSession,
} from '@/modules/pages/collections/types/pages.view-cache.types';
import { createMemoryStorage } from '@/modules/pages/local-cache/lib/local-cache.memory-storage.lib';
import { createOutbox } from '@/modules/pages/local-cache/lib/local-cache.outbox.lib';
import { openLocalCache } from '@/modules/pages/local-cache/lib/local-cache.store.lib';
import en from '../../../../../messages/en.json';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';
import { buildView } from '../lib/pages.views.fixture';

const calls: { input: Record<string, unknown>; kind: string }[] = [];
let changesAnswer: unknown = null;
let searchParamsText = 'view=Board';

mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined }),
}));
mock.module('next/navigation', () => ({
  useParams: () => ({ pageId: 'collection-1', spaceId: 'space-1' }),
  useSearchParams: () => new URLSearchParams(searchParamsText),
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async () => ({ data: { id: 'row-new' } }),
  duplicatePageAction: async () => ({ data: { id: 'row-copy' } }),
  reorderPageAction: async () => ({ data: null }),
  restorePageAction: async () => ({ data: null }),
  trashPageAction: async () => ({ data: null }),
}));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  applyPageViewOperationsAction: async () => ({ data: null }),
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  loadMorePageRowsAction: async () => ({ data: null }),
  movePageRowAction: async () => ({ data: null }),
  readEveryPageRowAction: async () => ({ data: null }),
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'changes' });
    return changesAnswer;
  },
  readPageMatchingRowsAction: async () => ({ data: null }),
  readPageUndatedCountAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'undated' });
    return { data: 4 };
  },
  readPageViewAggregatesAction: async () => ({ data: null }),
  refreshPageRowsAction: async () => ({ data: null }),
  rewritePageCollectionOptionAction: async () => ({ data: null }),
  updatePageCollectionAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));

const { PagesCollectionCachedPaint } = await import(
  '@/modules/pages/collections/components/pages.collection.cached-paint'
);

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
];

const view = buildView('Board', 'BOARD', {
  configuration: { groupBy: 'status', sorts: [{ direction: 'ASCENDING', propertyKey: 'title' }] },
  isDefault: true,
});

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [view] };

const rowOf = (id: string, status: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: { status },
  spaceId: 'space-1',
  title: `Task ${id}`,
});

const key = buildViewCacheKey({
  day: null,
  filter: null,
  month: null,
  pageId: 'collection-1',
  search: null,
  viewName: 'Board',
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

const keepBoard = async (session: PagesCollectionCacheSession): Promise<void> => {
  const cached = toCachedView({
    aggregates: null,
    lookups: { attachedFiles: [], people: [], relatedRows: [] },
    outcome: {
      groups: [
        { color: null, key: 'todo', label: 'todo', nextCursor: null, rows: [rowOf('a', 'todo')] },
        { color: null, key: 'done', label: 'done', nextCursor: null, rows: [rowOf('b', 'done')] },
      ],
      kind: 'GROUPED_ROWS',
    },
    personOptions: [],
    schema,
    view,
    viewerId: 'user-1',
  });
  await session.cache.saveRecords(
    cached.rows.map((row, position) => ({ id: row.id, row, spaceId: row.spaceId, version: position + 1 })),
  );
  await session.cache.saveResult({
    changesCursor: 'cursor-1',
    collectionId: 'collection-1',
    ids: cached.ids,
    key,
    layout: cached.layout,
    schemaVersion: 0,
    total: 2,
    viewVersion: view.version,
  });
};

const dateProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'due',
  label: 'Due',
  options: null,
  required: false,
  type: 'DATE',
};

const calendarView = buildView('Calendar', 'CALENDAR', { configuration: { dateProperty: 'due' } });
const calendarSchema: PageSchema = {
  pageId: 'collection-1',
  properties: [...properties, dateProperty],
  spaceId: 'space-1',
  views: [calendarView],
};

const datedRow = (id: string, start: string): PageRow => ({
  ...rowOf(id, 'todo'),
  propertyValues: { due: { start } },
});

const keepCalendar = async (session: PagesCollectionCacheSession): Promise<void> => {
  const cached = toCachedView({
    aggregates: null,
    lookups: { attachedFiles: [], people: [], relatedRows: [] },
    outcome: {
      calendar: { day: '2026-10-01', isTruncated: false, month: '2026-10', scale: 'MONTH', undated: 0 },
      kind: 'FLAT_ROWS',
      rows: [datedRow('a', '2026-10-05'), datedRow('b', '2026-10-06')],
    },
    personOptions: [],
    schema: calendarSchema,
    view: calendarView,
    viewerId: 'user-1',
  });
  await session.cache.saveRecords(cached.rows.map((row) => ({ id: row.id, row, spaceId: row.spaceId, version: 1 })));
  await session.cache.saveResult({
    changesCursor: 'cursor-1',
    collectionId: 'collection-1',
    ids: cached.ids,
    key: buildViewCacheKey({
      day: null,
      filter: null,
      month: null,
      pageId: 'collection-1',
      search: null,
      viewName: 'Calendar',
    }),
    layout: cached.layout,
    schemaVersion: 0,
    total: 2,
    viewVersion: calendarView.version,
  });
};

const drawWith = (session: null | PagesCollectionCacheSession): ReactNode => (
  <NextIntlClientProvider locale="en" messages={en}>
    <PAGE_COLLECTION_CACHE_CONTEXT value={session}>
      <PagesCollectionCachedPaint />
    </PAGE_COLLECTION_CACHE_CONTEXT>
  </NextIntlClientProvider>
);

describe('PagesCollectionCachedPaint', () => {
  beforeEach(() => {
    cleanup();
    calls.length = 0;
    changesAnswer = null;
    searchParamsText = 'view=Board';
  });

  it('draws the collection the person saw before, marked as being updated, without asking the server for it', async () => {
    const session = await openSession();
    await keepBoard(session);
    changesAnswer = { serverError: 'offline' };

    render(drawWith(session));

    expect(await screen.findByText('Task a')).toBeDefined();
    expect(screen.getByText('Task b')).toBeDefined();
    expect(screen.getByText(/updating/)).toBeDefined();
  });

  it('puts in place what changed since, asking only for the changes from the cursor it kept', async () => {
    const session = await openSession();
    await keepBoard(session);
    changesAnswer = {
      data: {
        attachedFiles: [],
        cursor: 'cursor-2',
        hasMore: false,
        isReset: false,
        possiblyChanged: [],
        possiblyChangedIsTruncated: false,
        relatedRows: [],
        rows: [rowOf('a', 'done')],
        total: 2,
        trashedIds: [],
      },
    };

    render(drawWith(session));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.input).toMatchObject({ cursor: 'cursor-1', pageId: 'collection-1', spaceId: 'space-1' });
    await waitFor(() => {
      const done = screen.getAllByTestId('board-column').find((column) => column.textContent?.includes('done'));
      expect(done?.textContent).toContain('Task a');
    });
  });

  it('takes a row out of a cached calendar when it was moved off the days drawn, and counts the undated again', async () => {
    searchParamsText = 'view=Calendar';
    const session = await openSession();
    await keepCalendar(session);
    changesAnswer = {
      data: {
        attachedFiles: [],
        cursor: 'cursor-2',
        hasMore: false,
        isReset: false,
        possiblyChanged: [],
        possiblyChangedIsTruncated: false,
        relatedRows: [],
        rows: [{ ...datedRow('a', '2030-01-01'), version: 2 }],
        total: 2,
        trashedIds: [],
      },
    };

    render(drawWith(session));

    await waitFor(() => expect(calls.filter((call) => call.kind === 'changes')).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText('Task a')).toBeNull());
    expect(screen.getByText('Task b')).toBeDefined();
    await waitFor(() => expect(calls.some((call) => call.kind === 'undated')).toBe(true));
    expect(session.cache.readRecord('a')?.version).toBe(2);
  });

  it('empties what it kept of the collection when the server says the person may not read it', async () => {
    const session = await openSession();
    await keepBoard(session);
    changesAnswer = { serverError: 'forbidden' };

    render(drawWith(session));

    await waitFor(() => expect(screen.queryByText('Task a')).toBeNull());
    expect(session.cache.readResult(key)).toBeNull();
    expect(session.cache.readRecord('a')).toBeNull();
  });

  it('shows the skeleton when the cache holds nothing for the question', async () => {
    const session = await openSession();

    render(drawWith(session));

    expect(screen.queryByTestId('collection-cached-paint')).toBeNull();
  });

  it('shows the skeleton while the cache is still opening', () => {
    render(drawWith(null));

    expect(screen.queryByTestId('collection-cached-paint')).toBeNull();
  });
});
