'use client';

import type { ColumnFiltersState, OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useTableAction } from '@/shared/hooks/use-table-action';
import type { UseTableSyncOptions, UseTableSyncResult } from '@/shared/types/use-table-sync.types';

export const useTableSync = ({
  columnFilters: urlColumnFilters,
  filtersKey,
  page,
  pageSize,
  sorting,
  buildUrl,
  debounceMs,
}: UseTableSyncOptions): UseTableSyncResult => {
  const router = useRouter();
  const { trigger, isLoading } = useTableAction({ debounceMs });

  const [editingFilters, setEditingFilters] = useState<ColumnFiltersState | undefined>(undefined);
  const localColumnFilters = editingFilters ?? urlColumnFilters;

  const filtersRef = useRef(localColumnFilters);
  const sortingRef = useRef(sorting);
  const intendedPageIndexRef = useRef(page - 1);

  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  const [isOwnNavigation, setIsOwnNavigation] = useState(false);

  useEffect(() => {
    filtersRef.current = localColumnFilters;
  }, [localColumnFilters]);

  useEffect(() => {
    sortingRef.current = sorting;
  }, [sorting]);

  useEffect(() => {
    intendedPageIndexRef.current = page - 1;
  }, [page]);

  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);

    if (isOwnNavigation) {
      setIsOwnNavigation(false);
    } else {
      setEditingFilters(undefined);
    }
  }

  const navigate = (pageIndex: number, nextSorting: SortingState, nextFilters: ColumnFiltersState) => {
    setIsOwnNavigation(true);
    router.push(
      buildUrl({
        pageIndex,
        pageSize,
        sorting: nextSorting,
        columnFilters: nextFilters,
      }),
    );
  };

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next =
      typeof updater === 'function' ? updater({ pageIndex: intendedPageIndexRef.current, pageSize }) : updater;

    intendedPageIndexRef.current = next.pageIndex;

    trigger(() => navigate(next.pageIndex, sortingRef.current, filtersRef.current));
  };

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;

    trigger(() => navigate(0, next, filtersRef.current));
  };

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    const base = editingFilters ?? urlColumnFilters;
    const next = typeof updater === 'function' ? updater(base) : updater;

    filtersRef.current = next;
    setEditingFilters(next);

    trigger(() => navigate(0, sortingRef.current, next));
  };

  return {
    localColumnFilters,
    isLoading,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
  };
};
