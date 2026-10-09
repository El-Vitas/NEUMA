export interface PagesRowSelection {
  readonly clear: () => void;
  readonly count: number;
  readonly isSelected: (rowId: string) => boolean;
  readonly selected: readonly string[];
  /** Acts on the rows in view, not on every stored row: filtered-out rows stay unselected. */
  readonly toggleAll: (rowIds: readonly string[]) => void;
  readonly toggleOne: (rowId: string) => void;
}
