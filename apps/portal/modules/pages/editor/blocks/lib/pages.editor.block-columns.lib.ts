import { Fragment, type NodeType } from 'prosemirror-model';
import type { Command, EditorState, Transaction } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import {
  PAGE_EDITOR_COLUMN_EDGE_MAX_PX,
  PAGE_EDITOR_COLUMN_EDGE_MIN_PX,
  PAGE_EDITOR_COLUMN_EDGE_RATIO,
  PAGE_EDITOR_DROP_EDGE_MIN_PX,
  PAGE_EDITOR_DROP_EDGE_RATIO,
} from '../constants/pages.editor.blocks.constants';
import type {
  PageEditorColumnDrop,
  PageEditorColumnSide,
  PageEditorColumnTypes,
} from '../types/pages.editor.block-drag.types';

export const isPointerAtPageEditorBlockEdge = (parameters: {
  readonly blockRect: { readonly height: number; readonly top: number };
  readonly clientY: number;
}): boolean => {
  const { blockRect, clientY } = parameters;
  const band = Math.max(blockRect.height * PAGE_EDITOR_DROP_EDGE_RATIO, PAGE_EDITOR_DROP_EDGE_MIN_PX);
  const middle = blockRect.height / 2;
  const reach = Math.min(band, middle);
  return clientY <= blockRect.top + reach || clientY >= blockRect.top + blockRect.height - reach;
};

/** The band is a share of the block width, capped so wide blocks are not mostly column target. */
export const findPageEditorColumnSide = (parameters: {
  readonly blockRect: { readonly left: number; readonly width: number };
  readonly clientX: number;
}): PageEditorColumnSide | null => {
  const { blockRect, clientX } = parameters;
  const right = blockRect.left + blockRect.width;
  const band = Math.min(
    Math.max(blockRect.width * PAGE_EDITOR_COLUMN_EDGE_RATIO, PAGE_EDITOR_COLUMN_EDGE_MIN_PX),
    PAGE_EDITOR_COLUMN_EDGE_MAX_PX,
  );

  // The bands reach past the block because the drag grip sits in the margin, so the pointer arrives from outside.
  if (clientX < blockRect.left - band || clientX > right + band) return null;

  // A block narrower than two bands has no middle, so each side takes half.
  if (blockRect.width <= band * 2) return clientX < blockRect.left + blockRect.width / 2 ? 'left' : 'right';

  if (clientX <= blockRect.left + band) return 'left';
  if (clientX >= right - band) return 'right';
  return null;
};

const readColumnTypes = (state: EditorState): PageEditorColumnTypes | null => {
  const column = state.schema.nodes.column;
  const columnList = state.schema.nodes.column_list;
  return column === undefined || columnList === undefined ? null : { column, columnList };
};

export const canSplitPageEditorBlockIntoColumns = (state: EditorState, blockStart: number): boolean => {
  const types = readColumnTypes(state);
  if (types === null) return false;
  const target = state.doc.nodeAt(blockStart);
  if (target === null || target.type === types.columnList) return false;
  const resolved = state.doc.resolve(blockStart);
  if (resolved.parent.type === types.column) return true;
  return resolved.parent.canReplaceWith(resolved.index(), resolved.index(), types.columnList);
};

const isColumnDropAllowed = (state: EditorState, drop: PageEditorColumnDrop): boolean => {
  if (drop.blockStart >= drop.range.from && drop.blockStart < drop.range.to) return false;
  if (!canSplitPageEditorBlockIntoColumns(state, drop.blockStart)) return false;
  return state.doc.slice(drop.range.from, drop.range.to).content.childCount > 0;
};

const addColumnToExistingRow = (parameters: {
  readonly draggedColumn: Fragment | ReturnType<NodeType['createChecked']>;
  readonly side: PageEditorColumnSide;
  readonly targetStart: number;
  readonly transaction: Transaction;
}): void => {
  const { draggedColumn, side, targetStart, transaction } = parameters;
  const resolved = transaction.doc.resolve(targetStart);
  const enclosingColumnStart = resolved.before(resolved.depth);
  const insertAt = side === 'left' ? enclosingColumnStart : enclosingColumnStart + resolved.parent.nodeSize;
  transaction.insert(insertAt, draggedColumn);
};

const wrapBlocksIntoNewRow = (parameters: {
  readonly draggedColumn: ReturnType<NodeType['createChecked']>;
  readonly side: PageEditorColumnSide;
  readonly targetStart: number;
  readonly transaction: Transaction;
  readonly types: PageEditorColumnTypes;
}): boolean => {
  const { draggedColumn, side, targetStart, transaction, types } = parameters;
  const target = transaction.doc.nodeAt(targetStart);
  if (target === null) return false;
  const targetColumn = types.column.createChecked(null, Fragment.from(target));
  const columns = side === 'left' ? [draggedColumn, targetColumn] : [targetColumn, draggedColumn];
  transaction.replaceWith(targetStart, targetStart + target.nodeSize, types.columnList.createChecked(null, columns));
  return true;
};

const buildColumnDropTransaction = (
  state: EditorState,
  drop: PageEditorColumnDrop,
  types: PageEditorColumnTypes,
): Transaction | null => {
  const content = state.doc.slice(drop.range.from, drop.range.to).content;
  const transaction = state.tr;
  if (!drop.copy) transaction.delete(drop.range.from, drop.range.to);

  const targetStart = transaction.mapping.map(drop.blockStart);
  const draggedColumn = types.column.createChecked(null, content);
  const landsInExistingRow = transaction.doc.resolve(targetStart).parent.type === types.column;
  if (landsInExistingRow) {
    addColumnToExistingRow({ draggedColumn, side: drop.side, targetStart, transaction });
  } else if (!wrapBlocksIntoNewRow({ draggedColumn, side: drop.side, targetStart, transaction, types })) {
    return null;
  }

  const landed = Math.min(targetStart + 2, transaction.doc.content.size);
  transaction.setSelection(Selection.near(transaction.doc.resolve(landed)));
  return transaction;
};

/** Inside an existing column row the dragged blocks become one more column; otherwise a new row of two. */
export const createPageEditorColumnDropCommand =
  (drop: PageEditorColumnDrop): Command =>
  (state, dispatch) => {
    const types = readColumnTypes(state);
    if (types === null || !isColumnDropAllowed(state, drop)) return false;
    if (dispatch === undefined) return true;

    const transaction = buildColumnDropTransaction(state, drop, types);
    if (transaction === null) return false;
    dispatch(transaction.scrollIntoView());
    return true;
  };
