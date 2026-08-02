import { useCallback, useMemo, useState } from 'react';

import type { SortDirection, UseSortableOptions, UseSortableResult } from './types/use-sortable.types';

export const useSortable = <T>({
  data,
  initialField,
  initialDir = 'desc',
}: UseSortableOptions<T>): UseSortableResult<T> => {
  const [sortField, setSortField] = useState<keyof T>(initialField);
  const [sortDir, setSortDir] = useState<SortDirection>(initialDir);

  const handleSort = useCallback(
    (field: keyof T) => {
      if (field === sortField) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField],
  );

  const sorted = useMemo(() => {
    return data.toSorted((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDir]);

  return { sortField, sortDir, sorted, handleSort };
};
