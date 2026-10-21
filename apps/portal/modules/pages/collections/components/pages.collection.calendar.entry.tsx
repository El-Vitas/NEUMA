'use client';

import { shiftPageCalendarDate } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/shared/components/ui/card';
import { PagesSidePanelLink } from '../../navigation/components/pages.side-panel.link';
import { PAGE_CALENDAR_KEYBOARD_STEPS } from '../constants/pages.calendar.constants';
import type { PageCalendarSlot, PagesCalendarMoving } from '../types/pages.calendar.types';

interface IProps {
  readonly canEdit: boolean;
  /** The day this part of the entry is drawn on. */
  readonly date: string;
  readonly moving: PagesCalendarMoving;
  readonly slot: PageCalendarSlot;
}

/**
 * One day of an entry. An entry that lasts several days is drawn as a run of these, square where it goes on, and named
 * where each part of it begins; any part can be grabbed and the whole entry moves by the day it was grabbed by.
 */
export const PagesCollectionCalendarEntry = ({ canEdit, date, moving, slot }: IProps) => {
  const t = useTranslations('pages');

  /** Keyboard alternative to dragging: Alt + arrows step by day or by week on a seven-column grid. */
  const moveOnArrow = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!canEdit || !event.altKey) return;
    const days = PAGE_CALENDAR_KEYBOARD_STEPS[event.key];
    if (days === undefined) return;
    event.preventDefault();
    moving.moveTo(slot.row.id, shiftPageCalendarDate(date, days - slot.daysIntoEntry));
  };

  return (
    <Card
      aria-label={canEdit ? t('collection.entryMoveHint', { title: slot.row.title }) : undefined}
      className={cn(
        'h-6 justify-center gap-0 rounded-sm border-0 bg-muted px-1.5 py-0 text-xs shadow-none',
        !slot.isFirstDay && '-ml-1 rounded-l-none',
        !slot.isLastDay && '-mr-1 rounded-r-none',
        canEdit && 'cursor-grab active:cursor-grabbing',
        moving.carried === slot.row.id && 'opacity-40',
      )}
      data-testid="calendar-entry"
      draggable={canEdit}
      onDragEnd={moving.forget}
      onDragStart={() => moving.take(slot.row.id, slot.daysIntoEntry)}
      onKeyDown={moveOnArrow}
      tabIndex={canEdit ? 0 : undefined}
    >
      {slot.showsTitle ? (
        <PagesSidePanelLink className="block truncate underline-offset-2 hover:underline" pageId={slot.row.id}>
          {slot.row.title.length > 0 ? slot.row.title : t('untitled')}
        </PagesSidePanelLink>
      ) : (
        <span aria-hidden="true">&nbsp;</span>
      )}
    </Card>
  );
};
