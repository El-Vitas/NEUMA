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
  PageViewBand,
} from '@/modules/pages/collections/types/pages.schema.types';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';

const rowOf = (id: string, propertyValues: PageRow['propertyValues'] = null): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues,
  spaceId: 'space-1',
  title: id,
});

const calls: { kind: string; input: Record<string, unknown> }[] = [];
let changesAnswer: unknown = null;
let columnAnswer: unknown = null;

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  loadMorePageRowsAction: async () => ({ data: null }),
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

const { usePagesBoardLive } = await import('@/modules/pages/collections/hooks/use.pages.board-live');

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

const aggregates = Promise.resolve(null);

const createNotices = () => {
  const listeners = new Set<(message: CollectionChangesMessage) => void>();
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
  };
  const send = (message: CollectionChangesMessage): void => {
    for (const listener of listeners) listener(message);
  };
  return { notices, refreshes, send };
};

const idsIn = (live: { bands: readonly PageViewBand[] }, key: string): readonly string[] =>
  live.bands[0]?.groups.find((group) => group.key === key)?.rows.map((row) => row.id) ?? [];

const input = {
  aggregates,
  bands,
  changesCursor: 'cursor-1' as null | string,
  groupByKey: 'status',
  groupByMode: 'OPTION' as const,
  pageId: 'collection-1',
  properties,
  spaceId: 'space-1',
  subGroupByKey: '',
  view,
};

describe('usePagesBoardLive', () => {
  beforeEach(() => {
    calls.length = 0;
    changesAnswer = null;
    columnAnswer = null;
  });

  it('places a card that another person moved, without asking the server to draw the page again', async () => {
    const fixture = createNotices();
    changesAnswer = {
      attachedFiles: [],
      cursor: 'cursor-2',
      hasMore: false,
      isReset: false,
      relatedRows: [],
      rows: [rowOf('a', { status: 'done' })],
      total: 2,
      trashedIds: [],
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_NOTICES_CONTEXT value={fixture.notices}>
        <PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT value={() => undefined}>
          {children}
        </PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT>
      </PAGE_COLLECTION_NOTICES_CONTEXT>
    );
    const { result } = renderHook(() => usePagesBoardLive(input), { wrapper });

    act(() => {
      fixture.send({
        collectionId: 'collection-1',
        rows: [{ id: 'a', version: 4 }],
        type: 'collection-changes',
        views: [],
      });
    });

    await waitFor(() => expect(idsIn(result.current, 'done')).toEqual(['a', 'b']));
    expect(idsIn(result.current, 'todo')).toEqual([]);
    expect(calls.filter((call) => call.kind === 'changes')).toHaveLength(1);
    expect(fixture.refreshes).toEqual([]);
  });

  it('keeps following when the page around it renders again between the notice and the read', async () => {
    const fixture = createNotices();
    changesAnswer = {
      attachedFiles: [],
      cursor: 'cursor-2',
      hasMore: false,
      isReset: false,
      relatedRows: [],
      rows: [rowOf('a', { status: 'done' })],
      total: 2,
      trashedIds: [],
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_NOTICES_CONTEXT value={fixture.notices}>
        <PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT value={() => undefined}>
          {children}
        </PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT>
      </PAGE_COLLECTION_NOTICES_CONTEXT>
    );
    const { rerender, result } = renderHook(() => usePagesBoardLive(input), { wrapper });

    act(() => {
      fixture.send({
        collectionId: 'collection-1',
        rows: [{ id: 'a', version: 4 }],
        type: 'collection-changes',
        views: [],
      });
    });
    rerender();

    await waitFor(() => expect(idsIn(result.current, 'done')).toEqual(['a', 'b']));
  });

  it('draws the page again when the view itself changed', async () => {
    const fixture = createNotices();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_NOTICES_CONTEXT value={fixture.notices}>{children}</PAGE_COLLECTION_NOTICES_CONTEXT>
    );
    renderHook(() => usePagesBoardLive(input), { wrapper });

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
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PAGE_COLLECTION_NOTICES_CONTEXT value={fixture.notices}>{children}</PAGE_COLLECTION_NOTICES_CONTEXT>
    );
    renderHook(() => usePagesBoardLive({ ...input, changesCursor: null }), { wrapper });

    act(() => {
      fixture.send({
        collectionId: 'collection-1',
        rows: [{ id: 'a', version: 4 }],
        type: 'collection-changes',
        views: [],
      });
    });

    expect(calls).toEqual([]);
  });
});
