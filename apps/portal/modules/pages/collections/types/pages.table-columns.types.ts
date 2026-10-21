import type { PageColumnAlignment, PageRowHeight } from '@neuma/shared';

export interface PagesTableColumns {
  readonly alignments: Readonly<Record<string, PageColumnAlignment>>;
  readonly rowHeight: PageRowHeight;
  readonly setAlignment: (columnKey: string, alignment: PageColumnAlignment) => void;
  readonly setRowHeight: (rowHeight: PageRowHeight) => void;
  readonly toggleWrapsText: () => void;
  readonly wrapsText: boolean;
  /** The columns whose text wraps even if the table as a whole does not. */
  readonly columnWraps: Readonly<Record<string, true>>;
  readonly toggleColumnWrap: (propertyKey: string) => void;
  /** Counts the name column as the first. */
  readonly frozenColumns: number;
  readonly isBusy: boolean;
  /** A null `beforeKey` moves the column to the end. */
  readonly moveColumn: (propertyKey: string, beforeKey: null | string) => void;
  readonly moveColumnSideways: (propertyKey: string, direction: 'EARLIER' | 'LATER') => void;
  readonly setFrozenColumns: (count: number) => void;
  readonly setWidth: (propertyKey: string, width: number) => void;
  readonly widths: Readonly<Record<string, number>>;
}
