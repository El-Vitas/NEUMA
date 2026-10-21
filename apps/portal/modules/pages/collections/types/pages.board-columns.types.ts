import type { PageOptionColor } from '@neuma/shared';

/** The first group of members belongs to the option value (all views); the second group to this view only. */
export interface PagesBoardColumns {
  readonly addColumn: (name: string) => void;
  readonly isBusy: boolean;
  /** Null `beforeValue` moves it to the end. */
  readonly moveColumn: (value: string, beforeValue: null | string) => void;
  readonly moveColumnSideways: (value: string, direction: 'EARLIER' | 'LATER') => void;
  readonly paintColumn: (value: string, color: PageOptionColor | null) => void;
  /** Removes the column only; its rows keep existing with no value. */
  readonly removeColumn: (value: string) => void;
  /** Rewrites the shape and every row holding the old name. */
  readonly renameColumn: (from: string, to: string) => void;

  readonly collapsedColumns: readonly string[];
  /** Columns the view keeps out of sight; the server does not draw them until they are shown again. */
  readonly hiddenColumns: readonly string[];
  readonly hidesEmptyGroups: boolean;
  readonly hidesUnassignedColumn: boolean;
  readonly limits: Readonly<Record<string, number>>;
  readonly setLimit: (value: string, limit: null | number) => void;
  readonly toggleCollapsed: (value: string) => void;
  readonly toggleHidden: (value: string) => void;
  readonly toggleUnassignedColumn: () => void;
}
