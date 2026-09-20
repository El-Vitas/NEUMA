/** Qué filas están marcadas ahora mismo, y cómo se marcan y desmarcan. */
export interface PagesRowSelection {
  readonly clear: () => void;
  readonly count: number;
  readonly isSelected: (rowId: string) => boolean;
  /** Marcadas, en el orden en que se dibujan. */
  readonly selected: readonly string[];
  /**
   * Marca todas las que se están viendo, o las desmarca si ya lo estaban.
   *
   * Las que se están viendo, no las que la colección guarda: quien filtró y
   * marca todo espera que lo escondido siga escondido.
   */
  readonly toggleAll: (rowIds: readonly string[]) => void;
  readonly toggleOne: (rowId: string) => void;
}
