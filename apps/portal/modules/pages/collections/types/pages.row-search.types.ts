/** Lo que se está buscando dentro de la colección, y quién cae dentro de la búsqueda. */
export interface PagesRowSearch {
  /** Cuántas filas de las que se están viendo coinciden. Todas, mientras no se busque nada. */
  readonly matchCount: number;
  /** Si una fila cae dentro de lo buscado, por lo que dice de sí misma. */
  readonly matches: (searchText: string) => boolean;
  readonly query: string;
  /** Si hay algo escrito en el buscador: sin ello, buscar no cambia nada de lo que se ve. */
  readonly searching: boolean;
  readonly setQuery: (query: string) => void;
  /** Cuántas filas hay para buscar, que son las que el filtro dejó pasar. */
  readonly total: number;
}
