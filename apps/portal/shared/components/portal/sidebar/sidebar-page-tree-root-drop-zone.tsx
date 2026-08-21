'use client';

import { useTranslations } from 'next-intl';
import type { DragEvent } from 'react';
import { cn } from '@/lib/utils';

interface IProps {
  readonly onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLButtonElement>) => void;
}

/**
 * Where a dragged page lands when it should stop being anyone's child.
 *
 * Shown only while a page is being dragged, and only for the one placement
 * `move()` can actually keep: becoming a root page of this space. A real
 * button, not a styled `div`, so it is reachable and announced like any
 * other control — the drop itself stays mouse-only, but nothing here is
 * pretending otherwise.
 */
export const SidebarPageTreeRootDropZone = ({ onDragOver, onDrop }: IProps) => {
  const t = useTranslations('pages');

  return (
    <button
      className={cn(
        'mx-1 mt-1 flex min-h-11 w-[calc(100%-0.5rem)] items-center justify-center rounded-sm border border-sidebar-border/70 border-dashed px-2 text-center text-[11px] text-sidebar-foreground/50',
        'data-[sidebar-page-drop-target=nest]:border-primary data-[sidebar-page-drop-target=nest]:bg-primary/10 data-[sidebar-page-drop-target=nest]:text-sidebar-foreground',
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
      type="button"
    >
      {t('spaceRoot')}
    </button>
  );
};
