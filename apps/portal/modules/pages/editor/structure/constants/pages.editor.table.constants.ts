import type { PageEditorTableAction } from '../types/pages.editor.table.types';

/** What a table offers, in the order it is offered: what it gains first, what it loses after. */
export const PAGE_EDITOR_TABLE_ACTIONS: readonly PageEditorTableAction[] = [
  'addRow',
  'addColumn',
  'deleteRow',
  'deleteColumn',
  'toggleHeaderRow',
  'deleteTable',
];
