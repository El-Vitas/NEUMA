import type { PageCalendarDay, PageDateValue } from '@neuma/shared';
import type { PageRow } from './pages.schema.types';

/** The first and the last day a calendar grid draws, as `YYYY-MM-DD`. */
export interface PageCalendarRange {
  readonly from: string;
  readonly to: string;
}

/** One entry on one day: whether the day is where it starts or ends, and whether the title is drawn there. */
export interface PageCalendarSlot {
  /** How many days after the first day of the entry this one is, so it can be grabbed by any of its days. */
  readonly daysIntoEntry: number;
  readonly isFirstDay: boolean;
  readonly isLastDay: boolean;
  readonly row: PageRow;
  /** The first day of the entry in each week of the grid, so a long entry is named where each of its parts begins. */
  readonly showsTitle: boolean;
}

export interface PageCalendarCell extends PageCalendarDay {
  /** One position per lane of the week, empty where nothing falls, so entries line up across the days of a week. */
  readonly slots: readonly (null | PageCalendarSlot)[];
}

export interface PagesCalendarMoving {
  /** The row being dragged. */
  readonly carried: null | string;
  /** The day an entry starts on, counting a drop the server has not confirmed yet. */
  readonly dateOf: (row: PageRow, stored: null | string) => null | string;
  /** Abandons the drag without writing anything. */
  readonly forget: () => void;
  /** Puts the entry where the dragged day lands, so a range grabbed by its third day lands by its third day. */
  readonly moveTo: (rowId: string, date: string) => void;
  /** `daysIntoEntry` is how far from its first day the entry was grabbed. */
  readonly take: (rowId: string, daysIntoEntry?: number) => void;
  /** The dates of the row, counting a drop the server has not confirmed yet. */
  readonly valueOf: (row: PageRow) => null | PageDateValue;
}
