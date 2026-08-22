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

/**
 * A table as it is first drawn: a few rows and columns, the first of them a
 * header. A table of one cell is not a table yet — whoever asked for one is
 * asking for a grid to fill, and the header row is what almost every table
 * turns out to need.
 */
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

/** Whether the writing is inside a table, which is what decides if a table can be asked anything. */
export const isPageEditorInTable = (state: EditorState): boolean => isInTable(state);

/**
 * Whether what is selected is cells rather than a block.
 *
 * Selecting a table selects its cells, which is a different kind of aim: what
 * applies to a block — becoming another type, above all — would land on one
 * cell of many and leave the table half changed.
 */
export const isPageEditorCellSelection = (state: EditorState): boolean => state.selection instanceof CellSelection;

/**
 * Tab walks to the next cell, and gives the table another row when there is no
 * next cell. Filling a table is one gesture repeated, so the table grows under
 * the writing rather than making someone stop to ask for room.
 */
export const goToNextPageTableCell: Command = (state, dispatch) => {
  if (!isInTable(state)) return false;
  if (goToNextCell(1)(state, dispatch)) return true;
  return addRowAfter(state, dispatch) && goToNextCell(1)(state, dispatch);
};

export const goToPreviousPageTableCell: Command = (state, dispatch) =>
  isInTable(state) && goToNextCell(-1)(state, dispatch);

/**
 * Turns the first row into a header, or back into a row like any other.
 *
 * It always answers about the first row, whatever is selected: the menu is
 * opened from the table's own grip, which selects every cell, and a header is
 * something a table has at the top rather than wherever the aim happened to be.
 */
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

/** What each thing a table can be asked for actually does. */
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
