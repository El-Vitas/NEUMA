import type { PageCalendarDay } from '@neuma/shared';
import type { PageRow } from './pages.schema.types';

/** The first and the last day a calendar grid draws, as `YYYY-MM-DD`. */
export interface PageCalendarRange {
  readonly from: string;
  readonly to: string;
}

export interface PageCalendarCell extends PageCalendarDay {
  readonly rows: readonly PageRow[];
}

export interface PagesCalendarMoving {
  readonly carried: null | string;
  readonly dateOf: (row: PageRow, stored: null | string) => null | string;
  /** Abandons the drag without writing anything. */
  readonly forget: () => void;
  readonly moveTo: (rowId: string, date: string) => void;
  readonly take: (rowId: string) => void;
}
