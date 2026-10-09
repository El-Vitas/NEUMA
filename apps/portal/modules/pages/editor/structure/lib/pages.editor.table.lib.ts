import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import {
  addColumnAfter,
  addRowAfter,
  CellSelection,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  isInTable,
  selectedRect,
  tableNodeTypes,
} from 'prosemirror-tables';
import { PAGE_EDITOR_TABLE_SIZE } from '../../blocks/constants/pages.editor.blocks.constants';
import type { PageEditorTableAction } from '../types/pages.editor.table.types';

/** A starter grid whose first row is a header. */
export const createPageTable = (schema: Schema): EditorNode => {
  const buildRow = (cellType: EditorNode['type']): EditorNode =>
    schema.nodes.table_row.createChecked(
      null,
      Array.from({ length: PAGE_EDITOR_TABLE_SIZE.columns }, () =>
        cellType.createChecked(null, schema.nodes.paragraph.createChecked()),
      ),
    );

  return schema.nodes.table.createChecked(null, [
    buildRow(schema.nodes.table_header),
    ...Array.from({ length: PAGE_EDITOR_TABLE_SIZE.rows - 1 }, () => buildRow(schema.nodes.table_cell)),
  ]);
};

export const isPageEditorInTable = (state: EditorState): boolean => isInTable(state);

/** Block commands such as changing type would hit one cell of many and leave the table half changed. */
export const isPageEditorCellSelection = (state: EditorState): boolean => state.selection instanceof CellSelection;

/** Adds a row when there is no next cell. */
export const goToNextPageTableCell: Command = (state, dispatch) => {
  if (!isInTable(state)) return false;
  if (goToNextCell(1)(state, dispatch)) return true;
  return addRowAfter(state, dispatch) && goToNextCell(1)(state, dispatch);
};

export const goToPreviousPageTableCell: Command = (state, dispatch) =>
  isInTable(state) && goToNextCell(-1)(state, dispatch);

/** Always acts on the first row: the menu opens from the table grip, which selects every cell. */
const togglePageTableHeaderRow: Command = (state, dispatch) => {
  if (!isInTable(state)) return false;
  const rect = selectedRect(state);
  const firstRow = rect.map.cellsInRect({ bottom: 1, left: 0, right: rect.map.width, top: 0 });
  const types = tableNodeTypes(state.schema);
  const alreadyHeader = firstRow.every((cell) => rect.table.nodeAt(cell)?.type === types.header_cell);
  const wanted = alreadyHeader ? types.cell : types.header_cell;
  if (dispatch === undefined) return true;

  const transaction = state.tr;
  for (const cell of firstRow) {
    const node = rect.table.nodeAt(cell);
    if (node !== null) transaction.setNodeMarkup(rect.tableStart + cell, wanted, node.attrs);
  }
  dispatch(transaction);
  return true;
};

const readTableCommand = (action: PageEditorTableAction): Command => {
  switch (action) {
    case 'addColumn':
      return addColumnAfter;
    case 'addRow':
      return addRowAfter;
    case 'deleteColumn':
      return deleteColumn;
    case 'deleteRow':
      return deleteRow;
    case 'deleteTable':
      return deleteTable;
    default:
      return togglePageTableHeaderRow;
  }
};

export const createPageTableCommand =
  (action: PageEditorTableAction): Command =>
  (state, dispatch) =>
    isInTable(state) && readTableCommand(action)(state, dispatch);
