'use client';

import type { PageDayRange } from '@neuma/shared';
import { PAGE_TIMELINE_LABEL_WIDTH, PAGE_TIMELINE_ROW_HEIGHT } from '../constants/pages.timeline.constants';
import { usePagesWindowVirtualizer } from '../hooks/use.pages.window-virtualizer';
import type { PagesTimelineDragging, PagesTimelineMoving, PageTimelineEntry } from '../types/pages.timeline.types';
import { PagesCollectionTimelineRow } from './pages.collection.timeline.row';

interface IProps {
  readonly canEdit: boolean;
  readonly dragging: PagesTimelineDragging;
  readonly entries: readonly PageTimelineEntry[];
  readonly moving: Pick<PagesTimelineMoving, 'change'>;
  readonly pixelsPerDay: number;
  readonly range: PageDayRange;
  /** Where the line for today goes, from the start of the days; null when today is not in the window. */
  readonly todayOffset: null | number;
  readonly totalWidth: number;
}

/** Only the rows in view plus a margin are drawn once there are many, and always the one being dragged. */
export const PagesCollectionTimelineRows = ({
  canEdit,
  dragging,
  entries,
  moving,
  pixelsPerDay,
  range,
  todayOffset,
  totalWidth,
}: IProps) => {
  const heldPosition = entries.findIndex((entry) => entry.row.id === dragging.drag?.rowId);
  const [rowsWindow, attachContainer] = usePagesWindowVirtualizer<HTMLDivElement>({
    count: entries.length,
    estimateSize: PAGE_TIMELINE_ROW_HEIGHT,
    keepIndex: heldPosition === -1 ? null : heldPosition,
  });
  const positions = rowsWindow.indexes ?? entries.map((_entry, position) => position);

  return (
    <div className="relative" ref={attachContainer}>
      {todayOffset !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-5 w-px bg-destructive"
          data-testid="timeline-today"
          style={{ left: PAGE_TIMELINE_LABEL_WIDTH + todayOffset + pixelsPerDay / 2 }}
        />
      )}
      {rowsWindow.before > 0 && <div aria-hidden="true" style={{ height: rowsWindow.before }} />}
      {positions.map((position) => {
        const entry = entries[position];
        if (entry === undefined) return null;
        return (
          <PagesCollectionTimelineRow
            canEdit={canEdit}
            dragging={dragging}
            entry={entry}
            index={position}
            key={entry.row.id}
            moving={moving}
            pixelsPerDay={pixelsPerDay}
            range={range}
            totalWidth={totalWidth}
          />
        );
      })}
      {rowsWindow.after > 0 && <div aria-hidden="true" style={{ height: rowsWindow.after }} />}
    </div>
  );
};
