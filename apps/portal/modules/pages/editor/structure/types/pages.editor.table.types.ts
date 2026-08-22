/** What a table can be asked to do to itself, once the writing is standing in one. */
export type PageEditorTableAction =
  | 'addRow'
  | 'addColumn'
  | 'deleteRow'
  | 'deleteColumn'
  | 'toggleHeaderRow'
  | 'deleteTable';
