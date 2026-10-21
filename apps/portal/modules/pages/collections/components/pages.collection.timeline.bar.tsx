'use client';

import type { PageTimelineBar, PageTimelineChangeMode } from '@neuma/shared';
import type { KeyboardEvent, PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { PAGE_TIMELINE_HANDLE_WIDTH, PAGE_TIMELINE_KEYBOARD_STEPS } from '../constants/pages.timeline.constants';
import type { PagesTimelineDragging } from '../types/pages.timeline.types';

interface IProps {
  readonly bar: PageTimelineBar;
  readonly canEdit: boolean;
  readonly dragging: PagesTimelineDragging;
  /** What a screen reader hears: the title and the days the bar covers. */
  readonly label: string;
  readonly onChange: (mode: PageTimelineChangeMode, deltaDays: number) => void;
  readonly rowId: string;
  readonly title: string;
}

/**
 * Drawn from its first to its last day. Pressed in the middle it moves, pressed at either end it stretches; the
 * keyboard does the same with Alt and the arrows, and with Shift on top it stretches the end.
 */
export const PagesCollectionTimelineBar = ({ bar, canEdit, dragging, label, onChange, rowId, title }: IProps) => {
  const isHeld = dragging.drag?.rowId === rowId;

  const stepOnArrow = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') dragging.cancel();
    const days = PAGE_TIMELINE_KEYBOARD_STEPS[event.key];
    if (!canEdit || !event.altKey || days === undefined) return;
    event.preventDefault();
    onChange(event.shiftKey ? 'RESIZE_END' : 'MOVE', days);
  };

  /** The ends sit inside the bar, so what they hear must not reach it as well: the release would count twice. */
  const holdEnd = (mode: PageTimelineChangeMode) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.stopPropagation();
      dragging.begin(event, rowId, mode);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      event.stopPropagation();
      dragging.move(event);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      event.stopPropagation();
      dragging.end(event);
    },
  });

  return (
    <article
      aria-label={label}
      className={cn(
        'absolute top-1.5 flex h-6 touch-none select-none items-center overflow-hidden rounded-sm bg-primary/85 px-2 text-primary-foreground text-xs',
        bar.startsBeforeWindow && 'rounded-l-none border-primary-foreground/50 border-l-2 border-dashed',
        bar.endsAfterWindow && 'rounded-r-none border-primary-foreground/50 border-r-2 border-dashed',
        canEdit && 'cursor-grab active:cursor-grabbing',
        isHeld && 'opacity-80 ring-2 ring-primary',
      )}
      data-testid="timeline-bar"
      onKeyDown={stepOnArrow}
      onPointerCancel={dragging.cancel}
      onPointerDown={canEdit ? (event) => dragging.begin(event, rowId, 'MOVE') : undefined}
      onPointerMove={dragging.move}
      onPointerUp={dragging.end}
      style={{ left: bar.left, width: bar.width }}
      tabIndex={canEdit ? 0 : undefined}
    >
      {canEdit && !bar.startsBeforeWindow && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 cursor-ew-resize"
          data-testid="timeline-handle-start"
          style={{ width: PAGE_TIMELINE_HANDLE_WIDTH }}
          {...holdEnd('RESIZE_START')}
        />
      )}
      <span className="pointer-events-none truncate">{title}</span>
      {canEdit && !bar.endsAfterWindow && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 cursor-ew-resize"
          data-testid="timeline-handle-end"
          style={{ width: PAGE_TIMELINE_HANDLE_WIDTH }}
          {...holdEnd('RESIZE_END')}
        />
      )}
    </article>
  );
};
