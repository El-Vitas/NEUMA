'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { PAGE_ROW_SELECTION_CONTEXT } from '../constants/pages.row-context.constants';
import { selectAllRows, selectOneRow } from '../lib/pages.row-selection.lib';
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
  /** Cada fila dibujada pregunta si está marcada, así que la respuesta no puede costar recorrer las marcadas. */
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
