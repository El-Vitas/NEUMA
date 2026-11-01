'use client';

import type { PageDayRange } from '@neuma/shared';
import { layoutPageTimelineBar } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { PagesSidePanelLink } from '../../navigation/components/pages.side-panel.link';
import { PAGE_TIMELINE_LABEL_WIDTH, PAGE_TIMELINE_ROW_HEIGHT } from '../constants/pages.timeline.constants';
import { previewTimelinePeriod } from '../lib/pages.timeline.lib';
import type { PagesTimelineDragging, PagesTimelineMoving, PageTimelineEntry } from '../types/pages.timeline.types';
import { PagesCollectionTimelineBar } from './pages.collection.timeline.bar';

interface IProps {
  readonly canEdit: boolean;
  readonly dragging: PagesTimelineDragging;
  readonly entry: PageTimelineEntry;
  readonly index: number;
  readonly moving: Pick<PagesTimelineMoving, 'change'>;
  readonly pixelsPerDay: number;
  /** The days the timeline draws. */
  readonly range: PageDayRange;
  readonly totalWidth: number;
}

/** The name of the row stays in view at the left while the days scroll; the bar sits where its days are. */
export const PagesCollectionTimelineRow = ({
  canEdit,
  dragging,
  entry,
  index,
  moving,
  pixelsPerDay,
  range,
  totalWidth,
}: IProps) => {
  const t = useTranslations('pages');
  const { period, row } = entry;
  const title = row.title.length > 0 ? row.title : t('untitled');
  const held = dragging.drag?.rowId === row.id ? dragging.drag : null;
  const bar =
    held === null
      ? entry.bar
      : (layoutPageTimelineBar(previewTimelinePeriod(period, held.mode, held.deltaDays), range, pixelsPerDay) ??
        entry.bar);

  return (
    <div
      className="flex border-border/60 border-b"
      data-index={index}
      data-testid="timeline-row"
      style={{ height: PAGE_TIMELINE_ROW_HEIGHT }}
    >
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center bg-surface px-2 text-sm"
        style={{ width: PAGE_TIMELINE_LABEL_WIDTH }}
      >
        <PagesSidePanelLink className="block truncate underline-offset-2 hover:underline" pageId={row.id}>
          {title}
        </PagesSidePanelLink>
      </div>
      <div className="relative shrink-0" style={{ width: totalWidth }}>
        <PagesCollectionTimelineBar
          bar={bar}
          canEdit={canEdit}
          dragging={dragging}
          label={
            canEdit
              ? t('collection.timelineBarHint', { end: period.end, start: period.start, title })
              : t('collection.timelineBarLabel', { end: period.end, start: period.start, title })
          }
          onChange={(mode, deltaDays) => moving.change(row.id, mode, deltaDays)}
          rowId={row.id}
          title={title}
        />
      </div>
    </div>
  );
};
