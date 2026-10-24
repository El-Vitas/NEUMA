import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PAGE_COLLECTION_NOTICES_CONTEXT } from '@/modules/pages/collections/constants/pages.collection-notices.context.constants';
import { PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT } from '@/modules/pages/collections/constants/pages.lookups.context.constants';
import type {
  CollectionChangesMessage,
  PagesCollectionNotices,
} from '@/modules/pages/collections/types/pages.collection-live.types';
import type { PageRow, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import type { PagesWindowRowsInput } from '@/modules/pages/collections/types/pages.window-rows.types';
import { defaultConfig } from '../lib/pages.options.fixture';
import { buildView } from '../lib/pages.views.fixture';

const calls: { input: Record<string, unknown>; kind: string }[] = [];
let changesAnswer: unknown = null;
let undatedAnswer: null | number = null;

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'changes' });
    return { data: changesAnswer };
  },
  readPageUndatedCountAction: async (input: Record<string, unknown>) => {
    calls.push({ input, kind: 'undated' });
    return { data: undatedAnswer };
  },
}));

const { usePagesWindowRows } = await import('@/modules/pages/collections/hooks/use.pages.window-rows');

const rowOf = (id: string, due: null | string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: due === null ? {} : { due: { start: due } },
  spaceId: 'space-1',
  title: id,
});

const properties: readonly PageSchemaProperty[] = [
  { config: defaultConfig, key: 'title', label: 'title', options: null, required: false, type: 'TITLE' },
  { config: defaultConfig, key: 'due', label: 'due', options: null, required: false, type: 'DATE' },
];

const seed = [rowOf('a', '2026-10-05'), rowOf('b', '2026-10-20')];

const input: PagesWindowRowsInput = {
  changesCursor: 'cursor-1',
  dateProperty: 'due',
  isTruncated: false,
  listsUndated: false,
  pageId: 'collection-1',
  properties,
  rows: seed,
  spaceId: 'space-1',
  undated: 2,
  undatedRows: [],
  view: buildView('Calendar', 'CALENDAR'),
  viewerId: 'me',
  windowFilters: [
    { kind: 'CONDITION', operator: 'IS', propertyKey: 'due', value: { end: '2026-10-31', start: '2026-10-01' } },
  ],
};

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
    subscribeStale: () => () => undefined,
  };
  return {
    notices,
    refreshes,
    send: (message: CollectionChangesMessage): void => {
      for (const listener of listeners) listener(message);
    },
  };
};

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

const changesOf = (overrides: Record<string, unknown>) => ({
  attachedFiles: [],
  cursor: 'cursor-2',
  hasMore: false,
  isReset: false,
  possiblyChanged: [],
  possiblyChangedIsTruncated: false,
  relatedRows: [],
  rows: [],
  total: 2,
  trashedIds: [],
  ...overrides,
});

const notice: CollectionChangesMessage = {
  collectionId: 'collection-1',
  rows: [{ id: 'a', version: 3 }],
  type: 'collection-changes',
  views: [],
};

describe('usePagesWindowRows', () => {
  beforeEach(() => {
    calls.length = 0;
    changesAnswer = null;
    undatedAnswer = null;
  });

  it('takes a row out of the days on screen when another person moves it to other days', async () => {
    const fixture = createNotices();
    changesAnswer = changesOf({ rows: [rowOf('a', '2026-12-05')] });
    const { result } = renderHook(() => usePagesWindowRows(input), { wrapper: wrapperFor(fixture) });

    act(() => fixture.send(notice));

    await waitFor(() => expect(result.current.rows.map((row) => row.id)).toEqual(['b']));
    expect(fixture.refreshes).toEqual([]);
  });

  it('reads the count of the rows without a date again after rows changed', async () => {
    const fixture = createNotices();
    changesAnswer = changesOf({ rows: [rowOf('a', null)] });
    undatedAnswer = 3;
    const { result } = renderHook(() => usePagesWindowRows(input), { wrapper: wrapperFor(fixture) });

    act(() => fixture.send(notice));

    await waitFor(() => expect(result.current.undated).toBe(3));
    expect(calls.filter((call) => call.kind === 'undated')).toHaveLength(1);
  });

  it('draws the page again, saying why, when the window holds only the first rows and a row comes in', async () => {
    const fixture = createNotices();
    changesAnswer = changesOf({ rows: [rowOf('n', '2026-10-10')] });
    renderHook(() => usePagesWindowRows({ ...input, isTruncated: true }), { wrapper: wrapperFor(fixture) });

    act(() => fixture.send(notice));

    await waitFor(() => expect(fixture.refreshes).toEqual(['window-truncated']));
  });

  it('follows nothing without a cursor', () => {
    const fixture = createNotices();
    renderHook(() => usePagesWindowRows({ ...input, changesCursor: null }), { wrapper: wrapperFor(fixture) });

    act(() => fixture.send(notice));

    expect(calls).toEqual([]);
  });
});
