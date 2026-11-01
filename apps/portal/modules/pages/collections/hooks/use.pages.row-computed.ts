'use client';

import { useOptimistic } from 'react';
import { NO_ROW_EDITS } from '../constants/pages.row-computed.constants';
import { applyRowEdits, recomputeRowFormulas } from '../lib/pages.computed-recompute.lib';
import type { PagesRowComputed, RowEdit, RowEdits } from '../types/pages.row-computed.types';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';

/**
 * What the formulas of a row show while a value of the row is being saved: the formulas that read the value are
 * recomputed here with the engine of the server, so the row never shows a result next to a value it no longer matches.
 */
export const usePagesRowComputed = (row: PageRow, properties: readonly PageSchemaProperty[]): PagesRowComputed => {
  const [edits, showEdit] = useOptimistic(
    NO_ROW_EDITS,
    (current: RowEdits, edit: RowEdit): RowEdits => ({ ...current, [edit.key]: edit.value }),
  );
  const editedKeys = Object.keys(edits);
  const recomputed =
    editedKeys.length === 0
      ? null
      : recomputeRowFormulas({
          editedKeys: new Set(editedKeys),
          properties,
          values: applyRowEdits(row.propertyValues ?? {}, edits),
        });
  const isRecomputed = (key: string): boolean =>
    recomputed !== null && (key in recomputed.values || key in recomputed.errors);

  return {
    errorOf: (key) => (isRecomputed(key) ? recomputed?.errors[key] : row.computedErrors?.[key]),
    onWriting: (key, value) => showEdit({ key, value }),
    valueOf: (key) => (isRecomputed(key) ? recomputed?.values[key] : row.propertyValues?.[key]),
  };
};
