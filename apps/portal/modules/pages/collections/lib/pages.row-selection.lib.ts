export const readSelectAllState = (marked: number, total: number): 'indeterminate' | boolean => {
  if (marked === 0) return false;
  return marked === total ? true : 'indeterminate';
};

/** Only the visible rows: after filtering, hidden rows must stay unselected. */
export const selectAllRows = (marked: ReadonlySet<string>, rowIds: readonly string[]): readonly string[] =>
  rowIds.every((rowId) => marked.has(rowId)) ? [] : [...rowIds];

export const selectOneRow = (
  marked: ReadonlySet<string>,
  current: readonly string[],
  rowId: string,
): readonly string[] => (marked.has(rowId) ? current.filter((candidate) => candidate !== rowId) : [...current, rowId]);
