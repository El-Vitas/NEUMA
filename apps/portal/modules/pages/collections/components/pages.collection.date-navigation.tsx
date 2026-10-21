'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface IProps {
  readonly earlierLabel: string;
  readonly laterLabel: string;
  readonly onEarlier: () => void;
  readonly onLater: () => void;
  readonly onToday: () => void;
  readonly title: string;
  readonly todayLabel: string;
}

/** The way through time of a calendar or a timeline: a step back, a step forward, and back to today. */
export const PagesCollectionDateNavigation = ({
  earlierLabel,
  laterLabel,
  onEarlier,
  onLater,
  onToday,
  title,
  todayLabel,
}: IProps) => (
  <div className="flex items-center gap-1">
    <button
      aria-label={earlierLabel}
      className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={onEarlier}
      type="button"
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
    </button>
    <button
      aria-label={laterLabel}
      className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={onLater}
      type="button"
    >
      <ChevronRight aria-hidden="true" className="size-4" />
    </button>
    <h3 className="px-1 font-medium text-foreground text-sm first-letter:uppercase">{title}</h3>
    <button
      className="ml-1 rounded-md px-2 py-1 text-muted-foreground text-xs hover:bg-muted hover:text-foreground"
      onClick={onToday}
      type="button"
    >
      {todayLabel}
    </button>
  </div>
);
