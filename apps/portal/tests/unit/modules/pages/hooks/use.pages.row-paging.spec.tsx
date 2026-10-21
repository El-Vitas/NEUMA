import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PAGE_ROW_QUERY_CONTEXT } from '@/modules/pages/collections/constants/pages.row-context.constants';
import type { PagesRowPagingInput } from '@/modules/pages/collections/types/pages.row-paging.types';
import type { PageRow } from '@/modules/pages/collections/types/pages.schema.types';

const rowOf = (id: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues: null,
  spaceId: 'space-1',
  title: id,
});

const asked: { kind: 'more' | 'refresh'; input: Record<string, unknown> }[] = [];
let nextPage = { nextCursor: null as null | string, rows: [rowOf('c'), rowOf('d')] };
let refreshedPage = { nextCursor: null as null | string, rows: [rowOf('c'), rowOf('d')] };
const errors: string[] = [];

mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  loadMorePageRowsAction: async (input: Record<string, unknown>) => {
    asked.push({ input, kind: 'more' });
    return { data: { attachedFiles: [], relatedRows: [], ...nextPage } };
  },
  refreshPageRowsAction: async (input: Record<string, unknown>) => {
    asked.push({ input, kind: 'refresh' });
    return { data: { attachedFiles: [], relatedRows: [], ...refreshedPage } };
  },
}));
mock.module('sonner', () => ({ toast: { error: (label: string) => errors.push(label) } }));
mock.module('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const { usePagesRowPaging } = await import('@/modules/pages/collections/hooks/use.pages.row-paging');

const baseInput: PagesRowPagingInput = {
  drawnRowIds: ['a', 'b'],
  firstCursor: 'after-b',
  pageId: 'collection-1',
  spaceId: 'space-1',
  viewId: 'view-1',
};

let searched = '';

const Searching = ({ children }: { children: ReactNode }) => (
  <PAGE_ROW_QUERY_CONTEXT value={{ search: searched }}>{children}</PAGE_ROW_QUERY_CONTEXT>
);

const loadFirstPage = async (result: { current: ReturnType<typeof usePagesRowPaging> }): Promise<void> => {
  nextPage = { nextCursor: 'after-d', rows: [rowOf('c'), rowOf('d')] };
  await act(async () => result.current.loadMore());
  await waitFor(() => expect(result.current.rows).toHaveLength(2));
};

describe('usePagesRowPaging', () => {
  beforeEach(() => {
    asked.length = 0;
    errors.length = 0;
  });

  it('asks for the next rows with the same words the server searched by', async () => {
    searched = 'informe';
    const { result } = renderHook(() => usePagesRowPaging(baseInput), { wrapper: Searching });

    await loadFirstPage(result);

    expect(asked[0]).toEqual({
      input: { cursor: 'after-b', pageId: 'collection-1', search: 'informe', spaceId: 'space-1', viewId: 'view-1' },
      kind: 'more',
    });
  });

  it('keeps the rows that were loaded when the server draws the scope again, and reads the window again', async () => {
    searched = '';
    const { rerender, result } = renderHook((input: PagesRowPagingInput) => usePagesRowPaging(input), {
      initialProps: baseInput,
      wrapper: Searching,
    });
    await loadFirstPage(result);
    refreshedPage = { nextCursor: 'after-d', rows: [rowOf('b'), rowOf('c'), rowOf('d')] };

    rerender({ ...baseInput, drawnRowIds: ['new', 'a'], firstCursor: 'after-a' });

    expect(result.current.rows.map((row) => row.id)).toEqual(['c', 'd']);
    await waitFor(() => expect(asked.some((call) => call.kind === 'refresh')).toBe(true));
    expect(asked.find((call) => call.kind === 'refresh')?.input).toEqual({
      cursor: 'after-a',
      pageId: 'collection-1',
      search: '',
      spaceId: 'space-1',
      viewId: 'view-1',
      wanted: 2,
    });
    await waitFor(() => expect(result.current.rows.map((row) => row.id)).toEqual(['b', 'c', 'd']));
    expect(result.current.hasMore).toBe(true);
  });

  it('never shows a loaded row twice when the server now draws it itself', async () => {
    searched = '';
    const { rerender, result } = renderHook((input: PagesRowPagingInput) => usePagesRowPaging(input), {
      initialProps: baseInput,
      wrapper: Searching,
    });
    await loadFirstPage(result);

    rerender({ ...baseInput, drawnRowIds: ['a', 'b', 'c'] });

    expect(result.current.rows.map((row) => row.id)).toEqual(['d']);
  });

  it('forgets what was loaded when the words searched change, since those rows no longer belong to the answer', async () => {
    searched = '';
    const { rerender, result } = renderHook(() => usePagesRowPaging(baseInput), { wrapper: Searching });
    await loadFirstPage(result);

    searched = 'otra cosa';
    rerender();

    expect(result.current.rows).toEqual([]);
    expect(asked.some((call) => call.kind === 'refresh')).toBe(false);
  });
});
