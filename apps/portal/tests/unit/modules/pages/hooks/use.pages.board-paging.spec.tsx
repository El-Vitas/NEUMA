import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PAGE_ROW_QUERY_CONTEXT } from '@/modules/pages/collections/constants/pages.row-context.constants';
import type { PageRow, PageViewBand } from '@/modules/pages/collections/types/pages.schema.types';

const rowOf = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: null,
  spaceId: 'space-1',
  title: id,
});

const asked: { kind: 'more' | 'refresh'; input: Record<string, unknown> }[] = [];
let moreRows = { nextCursor: 'after-d' as null | string, rows: [rowOf('c'), rowOf('d')] };
let refreshedRows = { nextCursor: 'after-d' as null | string, rows: [rowOf('b'), rowOf('c'), rowOf('d')] };

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  loadMorePageRowsAction: async (input: Record<string, unknown>) => {
    asked.push({ input, kind: 'more' });
    return { data: { attachedFiles: [], relatedRows: [], ...moreRows } };
  },
  refreshPageRowsAction: async (input: Record<string, unknown>) => {
    asked.push({ input, kind: 'refresh' });
    return { data: { attachedFiles: [], relatedRows: [], ...refreshedRows } };
  },
}));
mock.module('sonner', () => ({ toast: { error: () => undefined } }));
mock.module('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const { usePagesBoardPaging } = await import('@/modules/pages/collections/hooks/use.pages.board-paging');

const bandOf = (ids: readonly string[], nextCursor: null | string): PageViewBand => ({
  color: null,
  groups: [{ color: null, key: 'todo', label: 'todo', nextCursor, rows: ids.map(rowOf) }],
  key: '',
  label: '',
});

const input = (band: PageViewBand) => ({ bands: [band], pageId: 'collection-1', spaceId: 'space-1', viewId: 'view-1' });

let searched = '';

const Searching = ({ children }: { children: ReactNode }) => (
  <PAGE_ROW_QUERY_CONTEXT value={{ quickFilter: null, search: searched }}>{children}</PAGE_ROW_QUERY_CONTEXT>
);

const idsOf = (band: PageViewBand | undefined): string[] => band?.groups[0]?.rows.map((row) => row.id) ?? [];

describe('usePagesBoardPaging', () => {
  beforeEach(() => {
    asked.length = 0;
    moreRows = { nextCursor: 'after-d', rows: [rowOf('c'), rowOf('d')] };
    refreshedRows = { nextCursor: 'after-d', rows: [rowOf('b'), rowOf('c'), rowOf('d')] };
  });

  it('asks for the next cards of a column with the words the server searched by', async () => {
    searched = 'informe';
    const { result } = renderHook(() => usePagesBoardPaging(input(bandOf(['a'], 'after-a'))), {
      wrapper: Searching,
    });

    await act(async () => result.current.loadMore('', 'todo'));

    expect(asked[0]).toEqual({
      input: {
        cursor: 'after-a',
        group: { key: 'todo' },
        pageId: 'collection-1',
        quickFilter: null,
        search: 'informe',
        spaceId: 'space-1',
        viewId: 'view-1',
      },
      kind: 'more',
    });
  });

  it('keeps the cards a column loaded when the server draws it again, and reads the window again', async () => {
    let band = bandOf(['a'], 'after-a');
    searched = '';
    const { rerender, result } = renderHook(() => usePagesBoardPaging(input(band)), { wrapper: Searching });
    await act(async () => result.current.loadMore('', 'todo'));
    await waitFor(() => expect(idsOf(result.current.bands[0])).toEqual(['a', 'c', 'd']));

    band = bandOf(['a', 'b'], 'after-b');
    rerender();

    expect(idsOf(result.current.bands[0])).toEqual(['a', 'b', 'c', 'd']);
    await waitFor(() => expect(asked.some((call) => call.kind === 'refresh')).toBe(true));
    expect(asked.find((call) => call.kind === 'refresh')?.input).toEqual({
      cursor: 'after-b',
      group: { key: 'todo' },
      pageId: 'collection-1',
      quickFilter: null,
      search: '',
      spaceId: 'space-1',
      viewId: 'view-1',
      wanted: 2,
    });
    await waitFor(() => expect(result.current.bands[0]?.groups[0]?.nextCursor).toBe('after-d'));
  });

  it('forgets what a column loaded when the words searched change', async () => {
    searched = '';
    const { rerender, result } = renderHook(() => usePagesBoardPaging(input(bandOf(['a'], 'after-a'))), {
      wrapper: Searching,
    });
    await act(async () => result.current.loadMore('', 'todo'));
    await waitFor(() => expect(idsOf(result.current.bands[0])).toEqual(['a', 'c', 'd']));

    searched = 'otra cosa';
    rerender();

    expect(idsOf(result.current.bands[0])).toEqual(['a']);
  });
});
