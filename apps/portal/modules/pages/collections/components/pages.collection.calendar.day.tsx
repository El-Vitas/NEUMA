'use client';

import { shiftPageCalendarDate } from '@neuma/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { PagesSidePanelLink } from '../../navigation/components/pages.side-panel.link';
import { PAGE_CALENDAR_KEYBOARD_STEPS } from '../constants/pages.calendar.constants';
import type { PageCalendarCell, PagesCalendarMoving } from '../types/pages.calendar.types';

interface IProps {
  readonly canEdit: boolean;
  readonly cell: PageCalendarCell;
  readonly dayLabel: string;
  readonly isToday: boolean;
  readonly moving: PagesCalendarMoving;
  readonly onCreate: () => void;
}

/** Days of the adjacent months render dimmed, not omitted, so weeks stay whole. */
export const PagesCollectionCalendarDay = ({ canEdit, cell, dayLabel, isToday, moving, onCreate }: IProps) => {
  const t = useTranslations('pages');
  const isTarget = canEdit && moving.carried !== null;

  /** Keyboard alternative to dragging: Alt + arrows step by day or by week on a seven-column grid. */
  const moveOnArrow = (event: KeyboardEvent<HTMLDivElement>, rowId: string): void => {
    if (!canEdit || !event.altKey) return;
    const days = PAGE_CALENDAR_KEYBOARD_STEPS[event.key];
    if (days === undefined) return;
    event.preventDefault();
    moving.moveTo(rowId, shiftPageCalendarDate(cell.date, days));
  };

  return (
    <section
      aria-label={dayLabel}
      className={cn(
        'flex min-h-24 flex-col gap-1 border-border/60 border-t border-l p-1 transition-colors',
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
      {cell.rows.map((row) => (
        <Card
          aria-label={canEdit ? t('collection.entryMoveHint', { title: row.title }) : undefined}
          className={cn(
            'gap-0 rounded-sm border-0 bg-muted px-1.5 py-1 text-xs shadow-none',
            canEdit && 'cursor-grab active:cursor-grabbing',
            moving.carried === row.id && 'opacity-40',
          )}
          data-testid="calendar-entry"
          draggable={canEdit}
          key={row.id}
          onDragEnd={moving.forget}
          onDragStart={() => moving.take(row.id)}
          onKeyDown={(event) => moveOnArrow(event, row.id)}
          tabIndex={canEdit ? 0 : undefined}
        >
          <PagesSidePanelLink className="block truncate underline-offset-2 hover:underline" pageId={row.id}>
            {row.title.length > 0 ? row.title : t('untitled')}
          </PagesSidePanelLink>
        </Card>
      ))}
    </section>
  );
};
