/**
 * Cómo se ve la casilla que marca todas: vacía sin ninguna marcada, llena con
 * todas, y a medias cuando hay de las dos.
 *
 * Llena diría que están todas y vacía diría que no hay ninguna, y las dos
 * mentirían cuando hay la mitad.
 */
export const readSelectAllState = (marked: number, total: number): 'indeterminate' | boolean => {
  if (marked === 0) return false;
  return marked === total ? true : 'indeterminate';
};

/**
 * Marcar todas las que se están viendo, o desmarcarlas si ya lo estaban.
 *
 * Las que se están viendo, no las que la colección guarda: quien filtró y marca
 * todo espera que lo escondido siga escondido.
 */
export const selectAllRows = (marked: ReadonlySet<string>, rowIds: readonly string[]): readonly string[] =>
  rowIds.every((rowId) => marked.has(rowId)) ? [] : [...rowIds];

/** Marcar una que no lo estaba, o desmarcarla si lo estaba. */
export const selectOneRow = (
  marked: ReadonlySet<string>,
  current: readonly string[],
  rowId: string,
): readonly string[] => (marked.has(rowId) ? current.filter((candidate) => candidate !== rowId) : [...current, rowId]);
