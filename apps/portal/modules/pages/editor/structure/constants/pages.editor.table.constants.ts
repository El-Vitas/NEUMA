import type { PageEditorTableAction } from '../types/pages.editor.table.types';

/** Ordered as the menu offers them. */
export const PAGE_EDITOR_TABLE_ACTIONS: readonly PageEditorTableAction[] = [
  'addRow',
  'addColumn',
  'deleteRow',
  'deleteColumn',
  'toggleHeaderRow',
  'deleteTable',
];
