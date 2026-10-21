'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import type { PageCalendarCell, PagesCalendarMoving } from '../types/pages.calendar.types';
import { PagesCollectionCalendarEntry } from './pages.collection.calendar.entry';

interface IProps {
  readonly canEdit: boolean;
  readonly cell: PageCalendarCell;
  readonly dayLabel: string;
  /** A week gives each day more room than a month, which has to fit six rows of them on one screen. */
  readonly isTall?: boolean;
  readonly isToday: boolean;
  readonly moving: PagesCalendarMoving;
  readonly onCreate: () => void;
}

/** Days of the adjacent months render dimmed, not omitted, so weeks stay whole. */
export const PagesCollectionCalendarDay = ({
  canEdit,
  cell,
  dayLabel,
  isTall = false,
  isToday,
  moving,
  onCreate,
}: IProps) => {
  const t = useTranslations('pages');
  const isTarget = canEdit && moving.carried !== null;

  return (
    <section
      aria-label={dayLabel}
      className={cn(
        'flex flex-col gap-1 border-border/60 border-t border-l p-1 transition-colors',
        isTall ? 'min-h-64' : 'min-h-24',
        cell.isOfTheMonth ? 'bg-background' : 'bg-muted/30',
        isTarget && 'hover:bg-primary/10',
      )}
      data-testid="calendar-day"
      onDragOver={(event) => {
        if (!isTarget) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!isTarget || moving.carried === null) return;
        event.preventDefault();
        moving.moveTo(moving.carried, cell.date);
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            'px-1 text-xs tabular-nums',
            cell.isOfTheMonth ? 'text-foreground' : 'text-muted-foreground',
            isToday && 'rounded-full bg-primary px-1.5 font-medium text-primary-foreground',
          )}
        >
          {Number(cell.date.slice(-2))}
        </span>
        {canEdit && (
          <Button
            aria-label={t('collection.addRowOn', { day: dayLabel })}
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onCreate}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </Button>
        )}
      </div>
      {cell.slots.map((slot, lane) =>
        slot === null ? (
          <div aria-hidden="true" className="h-6" key={`empty-${String(lane)}`} />
        ) : (
          <PagesCollectionCalendarEntry
            canEdit={canEdit}
            date={cell.date}
            key={slot.row.id}
            moving={moving}
            slot={slot}
          />
        ),
      )}
    </section>
  );
};
