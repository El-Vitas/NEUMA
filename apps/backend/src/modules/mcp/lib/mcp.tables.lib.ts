import {
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageDocumentNodeShape,
  Result,
  replacePageBlock,
} from '@company-brain/shared';
import { MCP_EMPTY_PARAGRAPH_NODE } from '../constants/mcp.constants';
import type { McpContentEdit, McpTableCellChange, McpTableChange } from '../types/mcp.pages.types';
import { describeMcpMissingBlock, findMcpBlockNode } from './mcp.blocks.lib';
import { collectMcpResults } from './mcp.results.lib';

const changeCell = (rows: readonly unknown[], change: McpTableCellChange): Result<unknown[], string> => {
  const row = rows[change.row - 1];
  if (!isPageDocumentNode(row))
    return Result.fail(
      `The table has no row ${String(change.row)}: it has ${String(rows.length)}, the header being row 1.`,
    );
  const cells = listPageDocumentChildren(row);
  if (change.column > cells.length)
    return Result.fail(`The table has no column ${String(change.column)}: it has ${String(cells.length)}.`);
  /** La celda conserva lo que es —su id, su tipo, cuánto abarca— y cambia solo su párrafo. */
  const content = cells.map((cell, index) =>
    index === change.column - 1 ? { ...cell, content: [change.paragraph] } : cell,
  );
  const changed = { ...row, content };
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

/** Una fila nueva, del ancho de la tabla: las celdas que faltan quedan vacías, y una de más no cabe. */
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
 * Cambia una tabla sin reescribirla: unas celdas, filas nuevas al final y filas
 * que se van. Las filas se cuentan como las muestra fetch, desde la de los
 * encabezados, y siempre sobre la tabla como está antes del cambio. Lo que no
 * se toca conserva su id, así sus comentarios y enlaces siguen donde estaban.
 */
export const editMcpTable =
  (tableId: string, change: McpTableChange): McpContentEdit =>
  (content) => {
    const table = findMcpBlockNode(content.content, tableId);
    if (table === null) return Result.fail(describeMcpMissingBlock(tableId));
    if (table.type !== 'table') return Result.fail(`Block ${tableId} is not a table: change it with update_block.`);
    const rows = rebuildRows(table, change);
    return rows.isFail()
      ? Result.fail(rows.getError())
      : replacePageBlock(content, tableId, { ...table, content: rows.getValue() });
  };
