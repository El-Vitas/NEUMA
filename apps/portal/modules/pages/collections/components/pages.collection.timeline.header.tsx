'use client';

import type { PageDateScale, PageTimelineTick } from '@neuma/shared';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { PAGE_TIMELINE_LABEL_WIDTH, PAGE_TIMELINE_TICK_LABEL_FORMATS } from '../constants/pages.timeline.constants';

interface IProps {
  readonly pixelsPerDay: number;
  readonly scale: PageDateScale;
  readonly ticks: readonly PageTimelineTick[];
  readonly totalWidth: number;
}

/** The marks along the top: a day, a week or a month wide, each saying where it starts. */
export const PagesCollectionTimelineHeader = ({ pixelsPerDay, scale, ticks, totalWidth }: IProps) => {
  const locale = useLocale();
  const format = useMemo(
    () => new Intl.DateTimeFormat(locale, PAGE_TIMELINE_TICK_LABEL_FORMATS[scale]),
    [locale, scale],
  );

  return (
    <div
      className="flex border-border border-b bg-muted/40 text-muted-foreground text-xs"
      data-testid="timeline-header"
    >
      <div className="sticky left-0 z-20 shrink-0 bg-surface" style={{ width: PAGE_TIMELINE_LABEL_WIDTH }} />
      <div className="relative h-8 shrink-0" style={{ width: totalWidth }}>
        {ticks.map((tick) => (
          <span
            className="absolute inset-y-0 truncate border-border border-l px-1 py-1.5 first-letter:uppercase"
            key={tick.day}
            style={{ left: tick.offsetDays * pixelsPerDay, width: tick.spanDays * pixelsPerDay }}
          >
            {format.format(new Date(`${tick.day}T00:00:00.000Z`))}
          </span>
        ))}
      </div>
    </div>
  );
};
