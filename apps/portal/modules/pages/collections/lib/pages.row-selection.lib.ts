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
