import type { PageDateValue, PageDayRange, PageTimelineBar, PageTimelineChangeMode } from '@neuma/shared';
import type { PointerEvent } from 'react';
import type { PageRow } from './pages.schema.types';

/** The dates written to each row by property that the server has not drawn back yet. */
export type PagesTimelineChanges = Readonly<Record<string, Readonly<Record<string, PageDateValue>>>>;

export interface PagesTimelineMoving {
  /** Moves or stretches the bar of a row by days; one write, optimistic, undone if the server refuses. */
  readonly change: (rowId: string, mode: PageTimelineChangeMode, deltaDays: number) => void;
  /** The days the row lasts, counting a change the server has not confirmed yet. */
  readonly periodOf: (row: PageRow) => null | PageDayRange;
}

/** A bar being pressed: which one, which part of it, where the pointer went down and how many days it has gone. */
export interface PageTimelineDrag {
  readonly deltaDays: number;
  readonly mode: PageTimelineChangeMode;
  readonly rowId: string;
  readonly startX: number;
}

export interface PagesTimelineDragging {
  readonly begin: (event: PointerEvent<HTMLElement>, rowId: string, mode: PageTimelineChangeMode) => void;
  readonly cancel: () => void;
  /** Null when no bar is held. */
  readonly drag: null | PageTimelineDrag;
  readonly end: (event: PointerEvent<HTMLElement>) => void;
  readonly move: (event: PointerEvent<HTMLElement>) => void;
}

/** A row with a place in the window: the days it lasts and the bar that draws them. */
export interface PageTimelineEntry {
  readonly bar: PageTimelineBar;
  readonly period: PageDayRange;
  readonly row: PageRow;
}
