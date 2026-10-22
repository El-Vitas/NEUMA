import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '@/modules/pages/collections/constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT } from '@/modules/pages/collections/constants/pages.lookups.context.constants';
import type {
  CollectionChangesMessage,
  PagesCollectionNotices,
} from '@/modules/pages/collections/types/pages.collection-live.types';
import type {
  PageRow,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewBand,
} from '@/modules/pages/collections/types/pages.schema.types';
import type { PagesViewLiveInput } from '@/modules/pages/collections/types/pages.view-live.types';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';
import { COLLECTION_ACTION_STUBS, PAGE_ACTION_STUBS } from '../stubs/pages.actions.stubs';

const rowOf = (id: string, propertyValues: PageRow['propertyValues'] = null): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues,
  spaceId: 'space-1',
  title: id,
});

const calls: { kind: string; input: Record<string, unknown> }[] = [];
let changesAnswer: unknown = null;
let columnAnswer: unknown = null;
let everyRowAnswer: unknown = null;

mock.module('@/modules/pages/server/actions/pages.actions', () => PAGE_ACTION_STUBS);
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  ...COLLECTION_ACTION_STUBS,
  loadMorePageRowsAction: async () => ({ data: null }),
  readEveryPageRowAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'every-row' });
    return { data: everyRowAnswer };
  },
  readPageCollectionAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'schema' });
    return { data: { pageId: 'collection-1', properties: [], spaceId: 'space-1', views: [view] } };
  },
  readPageCollectionChangesAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'changes' });
    return { data: changesAnswer };
  },
  readPageViewAggregatesAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'aggregates' });
    return { data: null };
  },
  refreshPageRowsAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'column' });
    return { data: columnAnswer };
  },
}));
mock.module('sonner', () => ({ toast: { error: () => undefined } }));
mock.module('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const { usePagesViewLive } = await import('@/modules/pages/collections/hooks/use.pages.view-live');

const properties: readonly PageSchemaProperty[] = [
  { config: defaultConfig, key: 'title', label: 'title', options: null, required: false, type: 'TITLE' },
  {
    config: defaultConfig,
    key: 'status',
    label: 'status',
    options: asPropertyOptions('todo', 'done'),
    required: false,
    type: 'SELECT',
  },
];

const view: PageSchemaView = {
  configuration: { groupBy: 'status', sorts: [{ direction: 'ASCENDING', propertyKey: 'title' }] },
  id: 'view-1',
  isDefault: true,
  name: 'Board',
  type: 'BOARD',
  version: 1,
};

const column = (key: string, rows: readonly PageRow[]) => ({ color: null, key, label: key, nextCursor: null, rows });

const bands: readonly PageViewBand[] = [
  {
    color: null,
    groups: [column('todo', [rowOf('a', { status: 'todo' })]), column('done', [rowOf('b', { status: 'done' })])],
    key: '',
    label: '',
  },
];

const aggregatesOf = (count: number): PageViewAggregates => ({
  calculations: {},
  distinctRowCount: count,
  groupCalculations: {},
  groupCounts: {},
});

/** The promise of the counts is the one the server handed down: it does not change while the page stands. */
const twoRows = Promise.resolve(aggregatesOf(2));
const fortyRows = Promise.resolve(aggregatesOf(40));
const tooManyRows = Promise.resolve(aggregatesOf(10_001));

const createNotices = () => {
  const listeners = new Set<(message: CollectionChangesMessage) => void>();
  const staleReaders = new Set<(cause: string) => void>();
  const refreshes: string[] = [];
  const notices: PagesCollectionNotices = {
    dispatch: () => undefined,
    requestRefresh: (reason) => {
      refreshes.push(reason);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeStale: (listener) => {
      staleReaders.add(listener);
      return () => {
        staleReaders.delete(listener);
      };
    },
  };
  const send = (message: CollectionChangesMessage): void => {
    for (const listener of listeners) listener(message);
  };
  const tellStale = (cause: string): void => {
    for (const reader of staleReaders) reader(cause);
  };
  return { notices, refreshes, send, tellStale };
};

const idsIn = (live: { bands: readonly PageViewBand[] }, key: string): readonly string[] =>
  live.bands[0]?.groups.find((group) => group.key === key)?.rows.map((row) => row.id) ?? [];

const input: PagesViewLiveInput = {
  aggregates: Promise.resolve(null),
  bands,
  changesCursor: 'cursor-1',
  groupByKey: 'status',
  groupByMode: 'OPTION',
  pageId: 'collection-1',
  properties,
  spaceId: 'space-1',
  subGroupByKey: '',
  view,
  viewerId: 'me',
};

const changesOf = (rows: readonly PageRow[], total = 2) => ({
  attachedFiles: [],
  cursor: 'cursor-2',
  hasMore: false,
  isReset: false,
  possiblyChanged: [],
  possiblyChangedIsTruncated: false,
  relatedRows: [],
  rows,
  total,
  trashedIds: [],
});

const noticeFor = (id: string, version: number): CollectionChangesMessage => ({
  collectionId: 'collection-1',
  rows: [{ id, version }],
  type: 'collection-changes',
  views: [],
});

const wrapperFor = (fixture: ReturnType<typeof createNotices>) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <PAGE_COLLECTION_NOTICES_CONTEXT value={fixture.notices}>
      <PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT value={() => undefined}>
        {children}
      </PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT>
    </PAGE_COLLECTION_NOTICES_CONTEXT>
  );
  return Wrapper;
};

const everyRowPage = (rows: readonly PageRow[]) => ({
  attachedFiles: [],
  changesCursor: 'cursor-1',
  nextCursor: null,
  relatedRows: [],
  rows,
});

describe('usePagesViewLive when the server places the rows', () => {
  beforeEach(() => {
    calls.length = 0;
    changesAnswer = null;
    columnAnswer = null;
    everyRowAnswer = null;
  });

  it('places a card that another person moved, without asking the server to draw the page again', async () => {
    const fixture = createNotices();
    changesAnswer = changesOf([rowOf('a', { status: 'done' })]);
    const { result } = renderHook(() => usePagesViewLive(input), { wrapper: wrapperFor(fixture) });

    act(() => {
      fixture.send(noticeFor('a', 4));
    });

    await waitFor(() => expect(idsIn(result.current, 'done')).toEqual(['a', 'b']));
    expect(idsIn(result.current, 'todo')).toEqual([]);
    expect(calls.filter((call) => call.kind === 'changes')).toHaveLength(1);
    expect(fixture.refreshes).toEqual([]);
    expect(result.current.mode).toBe('server');
  });

  it('keeps following when the page around it renders again between the notice and the read', async () => {
    const fixture = createNotices();
    changesAnswer = changesOf([rowOf('a', { status: 'done' })]);
    const { rerender, result } = renderHook(() => usePagesViewLive(input), { wrapper: wrapperFor(fixture) });

    act(() => {
      fixture.send(noticeFor('a', 4));
    });
    rerender();

    await waitFor(() => expect(idsIn(result.current, 'done')).toEqual(['a', 'b']));
  });

  it('draws the page again when the shape of the collection changed', async () => {
    const fixture = createNotices();
    renderHook(() => usePagesViewLive(input), { wrapper: wrapperFor(fixture) });

    act(() => {
      fixture.send({
        collectionId: 'collection-1',
        rows: [],
        schemaVersion: 3,
        type: 'collection-changes',
        views: [],
      });
    });

    expect(fixture.refreshes).toEqual(['schema']);
  });

  it('does not follow anything without a cursor', async () => {
    const fixture = createNotices();
    renderHook(() => usePagesViewLive({ ...input, changesCursor: null }), { wrapper: wrapperFor(fixture) });

    act(() => {
      fixture.send(noticeFor('a', 4));
    });

    expect(calls).toEqual([]);
  });

  it('stays with the server for a collection too big for the browser to hold', async () => {
    const fixture = createNotices();
    const { result } = renderHook(() => usePagesViewLive({ ...input, aggregates: tooManyRows }), {
      wrapper: wrapperFor(fixture),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.mode).toBe('server');
    expect(calls.filter((call) => call.kind === 'every-row')).toEqual([]);
  });
});

describe('usePagesViewLive when the browser holds the rows', () => {
  beforeEach(() => {
    calls.length = 0;
    changesAnswer = null;
    columnAnswer = null;
    everyRowAnswer = everyRowPage([rowOf('a', { status: 'todo' }), rowOf('b', { status: 'done' })]);
  });

  const renderClient = (fixture: ReturnType<typeof createNotices>) =>
    renderHook(() => usePagesViewLive({ ...input, aggregates: twoRows }), { wrapper: wrapperFor(fixture) });

  it('reads every row once and draws the view from them', async () => {
    const fixture = createNotices();
    const { result } = renderClient(fixture);

    await waitFor(() => expect(result.current.mode).toBe('client'));

    expect(idsIn(result.current, 'todo')).toEqual(['a']);
    expect(idsIn(result.current, 'done')).toEqual(['b']);
    expect(calls.filter((call) => call.kind === 'every-row')).toHaveLength(1);
  });

  it('moves a card another person changed with no question to the server for the view', async () => {
    const fixture = createNotices();
    const { result } = renderClient(fixture);
    await waitFor(() => expect(result.current.mode).toBe('client'));
    changesAnswer = changesOf([rowOf('a', { status: 'done' })]);

    act(() => {
      fixture.send(noticeFor('a', 4));
    });

    await waitFor(() => expect(idsIn(result.current, 'done')).toEqual(['a', 'b']));
    expect(idsIn(result.current, 'todo')).toEqual([]);
    expect(calls.filter((call) => call.kind === 'every-row')).toHaveLength(1);
    expect(calls.filter((call) => call.kind === 'column')).toEqual([]);
    expect(fixture.refreshes).toEqual([]);
  });

  it('shows a card the browser did not hold when another person creates it', async () => {
    const fixture = createNotices();
    const { result } = renderClient(fixture);
    await waitFor(() => expect(result.current.mode).toBe('client'));
    changesAnswer = changesOf([rowOf('c', { status: 'todo' })], 3);

    act(() => {
      fixture.send(noticeFor('c', 1));
    });

    await waitFor(() => expect(idsIn(result.current, 'todo')).toEqual(['a', 'c']));
  });

  it('drops a card that went to the trash', async () => {
    const fixture = createNotices();
    const { result } = renderClient(fixture);
    await waitFor(() => expect(result.current.mode).toBe('client'));
    changesAnswer = { ...changesOf([], 1), trashedIds: ['b'] };

    act(() => {
      fixture.send(noticeFor('b', 5));
    });

    await waitFor(() => expect(idsIn(result.current, 'done')).toEqual([]));
  });

  it('reads every row again when the server says the rows held may be wrong', async () => {
    const fixture = createNotices();
    const { result } = renderClient(fixture);
    await waitFor(() => expect(result.current.mode).toBe('client'));
    everyRowAnswer = everyRowPage([rowOf('a', { status: 'todo' })]);

    act(() => {
      fixture.tellStale('collection-revoked');
    });

    await waitFor(() => expect(idsIn(result.current, 'done')).toEqual([]));
    expect(calls.filter((call) => call.kind === 'every-row')).toHaveLength(2);
  });

  it('reads every row again when the cursor was reset', async () => {
    const fixture = createNotices();
    const { result } = renderClient(fixture);
    await waitFor(() => expect(result.current.mode).toBe('client'));
    changesAnswer = { ...changesOf([]), isReset: true };

    act(() => {
      fixture.send(noticeFor('a', 4));
    });

    await waitFor(() => expect(calls.filter((call) => call.kind === 'every-row')).toHaveLength(2));
    expect(fixture.refreshes).toEqual([]);
  });

  it('shows more cards of a column without asking the server', async () => {
    const fixture = createNotices();
    const many = Array.from({ length: 40 }, (_unused, index) =>
      rowOf(`t${String(index).padStart(2, '0')}`, { status: 'todo' }),
    );
    everyRowAnswer = everyRowPage(many);
    const { result } = renderHook(() => usePagesViewLive({ ...input, aggregates: fortyRows }), {
      wrapper: wrapperFor(fixture),
    });
    await waitFor(() => expect(result.current.mode).toBe('client'));

    expect(idsIn(result.current, 'todo')).toHaveLength(25);

    act(() => {
      result.current.loadMore('', 'todo');
    });

    expect(idsIn(result.current, 'todo')).toHaveLength(40);
    expect(calls.filter((call) => call.kind === 'every-row')).toHaveLength(1);
  });

  it('goes back to the server when the viewer is unknown and the filter says me', async () => {
    const fixture = createNotices();
    const mine: PageSchemaView = {
      ...view,
      configuration: {
        ...view.configuration,
        filter: {
          conditions: [{ kind: 'CONDITION', operator: 'CONTAINS', propertyKey: 'status', value: '@me' }],
          kind: 'GROUP',
          operator: 'AND',
        },
      },
    };
    const { result } = renderHook(
      () => usePagesViewLive({ ...input, aggregates: twoRows, view: mine, viewerId: null }),
      {
        wrapper: wrapperFor(fixture),
      },
    );

    await waitFor(() => expect(calls.filter((call) => call.kind === 'every-row')).toHaveLength(1));

    expect(result.current.mode).toBe('server');
  });
});
