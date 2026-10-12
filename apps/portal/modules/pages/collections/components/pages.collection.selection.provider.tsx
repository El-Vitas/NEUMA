'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { PAGE_ROW_SELECTION_CONTEXT } from '../constants/pages.row-context.constants';
import { selectAllRows, selectOneRow } from '../lib/pages.row-selection.lib';
import type { PagesRowSelection } from '../types/pages.row-selection.types';

/** The selection is deliberately not persisted: rows found still marked on reload would be a trap before a delete. */
export const PagesCollectionSelectionProvider = ({ children }: { readonly children: ReactNode }) => {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const marked = useMemo(() => new Set(selected), [selected]);

  const selection = useMemo<PagesRowSelection>(
    () => ({
      clear: () => setSelected([]),
      count: selected.length,
      isSelected: (rowId: string) => marked.has(rowId),
      selected,
      toggleAll: (rowIds: readonly string[]) => setSelected(selectAllRows(marked, rowIds)),
      toggleOne: (rowId: string) => setSelected(selectOneRow(marked, selected, rowId)),
    }),
    [marked, selected],
  );

  return <PAGE_ROW_SELECTION_CONTEXT value={selection}>{children}</PAGE_ROW_SELECTION_CONTEXT>;
};
