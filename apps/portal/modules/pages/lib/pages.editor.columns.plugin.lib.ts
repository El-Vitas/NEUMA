import { type Node as EditorNode, Fragment } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';
import { PAGE_EDITOR_COLUMN_ROW_TYPE } from '../constants/pages.editor.blocks.constants';
import type { PageEditorColumnRowCleanup } from '../types/pages.editor.block-drag.types';

const isEmptyColumn = (column: EditorNode): boolean =>
  column.childCount === 1 && column.firstChild !== null && column.firstChild.isTextblock && column.textContent === '';

const findRowsToTidy = (document: EditorNode): readonly PageEditorColumnRowCleanup[] => {
  const rows: PageEditorColumnRowCleanup[] = [];
  document.descendants((node, position) => {
    if (node.type.name !== PAGE_EDITOR_COLUMN_ROW_TYPE) return;
    const kept = node.children.filter((column) => !isEmptyColumn(column));
    if (kept.length !== node.childCount || kept.length < 2) rows.push({ kept, position, row: node });
  });
  return rows;
};

const tidyRowContent = (row: EditorNode, kept: readonly EditorNode[]): Fragment => {
  if (kept.length >= 2) return Fragment.from(row.type.createChecked(row.attrs, kept));
  const survivor = kept[0] ?? row.firstChild;
  return survivor === null || survivor === undefined ? Fragment.empty : survivor.content;
};

/**
 * Keeps a row of columns honest after every edit: a column left with nothing
 * in it stops being a column, and a row left with a single column stops being
 * a row, so its blocks go back to the page.
 *
 * Without this, dragging the last block out of a column would leave an empty
 * column — and later a row of one — that look like layout but hold nothing.
 */
export const createPageEditorColumnCleanupPlugin = (): EditorPlugin =>
  new EditorPlugin({
    appendTransaction: (transactions, _previousState, nextState) => {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;
      const rows = findRowsToTidy(nextState.doc);
      if (rows.length === 0) return null;

      const transaction = nextState.tr;
      for (const { kept, position, row } of rows) {
        const rowStart = transaction.mapping.map(position);
        transaction.replaceWith(rowStart, rowStart + row.nodeSize, tidyRowContent(row, kept));
      }
      return transaction;
    },
  });
