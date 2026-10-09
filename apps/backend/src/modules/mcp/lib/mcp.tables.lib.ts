import {
  describeMissingPageBlock,
  findPageBlock,
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageDocumentNodeShape,
  Result,
  replacePageBlock,
} from '@company-brain/shared';
import { MCP_EMPTY_PARAGRAPH_NODE } from '../constants/mcp.constants';
import type { McpContentEdit, McpTableCellChange, McpTableChange } from '../types/mcp.pages.types';
import { collectMcpResults } from './mcp.results.lib';

const replaceCellParagraph = (
  cells: readonly PageDocumentNodeShape[],
  column: number,
  paragraph: unknown,
): PageDocumentNodeShape[] =>
  cells.map((cell, index) => (index === column - 1 ? { ...cell, content: [paragraph] } : cell));

const changeCell = (rows: readonly unknown[], change: McpTableCellChange): Result<unknown[], string> => {
  const row = rows[change.row - 1];
  if (!isPageDocumentNode(row))
    return Result.fail(
      `The table has no row ${String(change.row)}: it has ${String(rows.length)}, the header being row 1.`,
    );
  const cells = listPageDocumentChildren(row);
  if (change.column > cells.length)
    return Result.fail(`The table has no column ${String(change.column)}: it has ${String(cells.length)}.`);
  const changed = { ...row, content: replaceCellParagraph(cells, change.column, change.paragraph) };
  return Result.ok(rows.with(change.row - 1, changed));
};

const changeCells = (rows: readonly unknown[], changes: readonly McpTableCellChange[]): Result<unknown[], string> =>
  changes.reduce<Result<unknown[], string>>(
    (carried, change) => (carried.isFail() ? carried : changeCell(carried.getValue(), change)),
    Result.ok([...rows]),
  );

const deleteRows = (rows: readonly unknown[], numbers: readonly number[]): Result<unknown[], string> => {
  if (numbers.includes(1)) return Result.fail('Row 1 is the header of the table and stays; change its cells instead.');
  const missing = numbers.find((number) => number > rows.length);
  if (missing !== undefined)
    return Result.fail(
      `The table has no row ${String(missing)}: it has ${String(rows.length)}, the header being row 1.`,
    );
  return Result.ok(rows.filter((_row, index) => !numbers.includes(index + 1)));
};

const writeRow = (paragraphs: readonly unknown[], width: number): Result<unknown, string> => {
  if (paragraphs.length > width)
    return Result.fail(`The table has ${String(width)} columns, but a new row has ${String(paragraphs.length)} cells.`);
  const filled = [...paragraphs, ...Array.from({ length: width - paragraphs.length }, () => MCP_EMPTY_PARAGRAPH_NODE)];
  return Result.ok({
    content: filled.map((paragraph) => ({ content: [paragraph], type: 'table_cell' })),
    type: 'table_row',
  });
};

const readWidth = (rows: readonly unknown[]): number => {
  const [header] = rows;
  return isPageDocumentNode(header) ? listPageDocumentChildren(header).length : 0;
};

const rebuildRows = (table: PageDocumentNodeShape, change: McpTableChange): Result<unknown[], string> => {
  const rows = listPageDocumentChildren(table);
  const changed = changeCells(rows, change.cells ?? []);
  if (changed.isFail()) return changed;
  const kept = deleteRows(changed.getValue(), change.deleteRows ?? []);
  if (kept.isFail()) return kept;
  const added = collectMcpResults((change.addRows ?? []).map((row) => writeRow(row, readWidth(rows))));
  return added.isFail() ? Result.fail(added.getError()) : Result.ok([...kept.getValue(), ...added.getValue()]);
};

/**
 * Rows are counted as fetch shows them (header first), against the table before the change.
 * Untouched parts keep their ids so comments and links stay attached.
 */
export const editMcpTable =
  (tableId: string, change: McpTableChange): McpContentEdit =>
  (content) => {
    const table = findPageBlock(content.content, tableId);
    if (table === null) return Result.fail(describeMissingPageBlock(tableId));
    if (table.type !== 'table') return Result.fail(`Block ${tableId} is not a table: change it with update_block.`);
    const rows = rebuildRows(table, change);
    return rows.isFail()
      ? Result.fail(rows.getError())
      : replacePageBlock(content, tableId, { ...table, content: rows.getValue() });
  };
