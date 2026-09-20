/** Cambiar de sitio los grupos de una tabla, que son los valores por los que agrupa. */
export interface PagesGroupOrdering {
  /** Si ese grupo es un valor declarado, que es lo único que se puede cambiar de sitio. */
  readonly canMove: (groupKey: string) => boolean;
  readonly isBusy: boolean;
  readonly move: (groupKey: string, direction: 'EARLIER' | 'LATER') => void;
}
