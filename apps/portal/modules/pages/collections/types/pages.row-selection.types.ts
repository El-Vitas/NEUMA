import type { PagePropertyValues } from './pages.schema.types';

export interface PagesMatchingSelection {
  readonly isReading: boolean;
  readonly selectAllMatching: () => void;
}

export interface PagesRowSelection {
  readonly clear: () => void;
  readonly count: number;
  readonly isSelected: (rowId: string) => boolean;
  /** What the rows marked without being loaded held, which their undo needs. */
  readonly knownValues: Readonly<Record<string, PagePropertyValues>>;
  readonly selected: readonly string[];
  /** Marks exactly these rows, the ones never loaded included, and remembers what they held. */
  readonly selectMany: (rowIds: readonly string[], valuesByRow: Readonly<Record<string, PagePropertyValues>>) => void;
  /** Acts on the rows in view, not on every stored row: filtered-out rows stay unselected. */
  readonly toggleAll: (rowIds: readonly string[]) => void;
  readonly toggleOne: (rowId: string) => void;
}
