'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { PAGE_ROW_SELECTION_CONTEXT } from '../constants/pages.row-context.constants';
import type { PagesRowSelection } from '../types/pages.row-selection.types';

/**
 * Pone al alcance de todo lo que hay debajo qué filas están marcadas.
 *
 * No se guarda en ninguna parte: es de este rato y de quien mira. Recargar lo
 * deshace, y eso está bien —marcar veinte filas y encontrárselas marcadas
 * mañana sería una trampa justo antes de borrarlas.
 */
export const PagesCollectionSelectionProvider = ({ children }: { readonly children: ReactNode }) => {
  const [selected, setSelected] = useState<readonly string[]>([]);

  const selection = useMemo<PagesRowSelection>(
    () => ({
      clear: () => setSelected([]),
      count: selected.length,
      isSelected: (rowId: string) => selected.includes(rowId),
      selected,
      toggleAll: (rowIds: readonly string[]) =>
        setSelected((current) => (rowIds.every((rowId) => current.includes(rowId)) ? [] : [...rowIds])),
      toggleOne: (rowId: string) =>
        setSelected((current) =>
          current.includes(rowId) ? current.filter((candidate) => candidate !== rowId) : [...current, rowId],
        ),
    }),
    [selected],
  );

  return <PAGE_ROW_SELECTION_CONTEXT value={selection}>{children}</PAGE_ROW_SELECTION_CONTEXT>;
};
