import { describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

const push = mock<(href: string) => void>();

mock.module('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
}));

mock.module('@/shared/hooks/use-table-action', () => ({
  useTableAction: () => ({
    cancel: () => undefined,
    isLoading: false,
    trigger: (action: () => void) => action(),
  }),
}));

import { useTableSync } from '@/shared/hooks/use-table-sync';

describe('useTableSync', () => {
  it('passes pagination URLs with query strings to the locale-aware router', () => {
    const { result } = renderHook(() =>
      useTableSync({
        buildUrl: ({ pageIndex, pageSize, columnFilters }) =>
          `/users?page=${pageIndex + 1}&pageSize=${pageSize}&search=${columnFilters[0]?.value ?? ''}`,
        columnFilters: [{ id: 'name', value: 'ana' }],
        filtersKey: 'ana',
        page: 1,
        pageSize: 20,
        sorting: [],
      }),
    );

    act(() => {
      result.current.onPaginationChange({ pageIndex: 1, pageSize: 20 });
    });

    expect(push).toHaveBeenCalledWith('/users?page=2&pageSize=20&search=ana');
  });
});
