import type { PageCalendarDay } from '@company-brain/shared';
import type { PageRow } from './pages.schema.types';

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
