'use client';

import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { PrimaryButton } from '@/shared/components/forms/primary-button';
import { ImageWithFallback } from '@/shared/components/ui/image-with-fallback';
import {
  PAGE_COVER_KEYBOARD_STEP,
  PAGE_COVER_POSITION_MAX,
  PAGE_COVER_POSITION_MIN,
} from '../constants/pages.cover.constants';
import { clampPageCoverPosition, computePageCoverDragPosition, resolvePageCoverImageUrl } from '../lib/pages.cover.lib';
import type { PagesCoverController } from '../types/pages.cover.types';

interface IProps {
  readonly controller: PagesCoverController;
}

/** Takes over the pointer only while repositioning, so outside it a touch drag still scrolls the page. */
export const PagesCover = ({ controller }: IProps) => {
  const t = useTranslations('pages.cover');
  const [draggedPosition, setDraggedPosition] = useState<number | null>(null);
  const dragStateRef = useRef<{ height: number; startPosition: number; startY: number } | null>(null);

  const { cover, isRepositioning } = controller;
  if (cover === null) return null;

  const shownPosition = draggedPosition ?? cover.position;

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const dragState = dragStateRef.current;
    if (dragState === null) return;
    setDraggedPosition(
      computePageCoverDragPosition(dragState.startPosition, event.clientY - dragState.startY, dragState.height),
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!isRepositioning) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      height: event.currentTarget.offsetHeight,
      startPosition: shownPosition,
      startY: event.clientY,
    };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (dragStateRef.current === null) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!isRepositioning || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const step = event.key === 'ArrowUp' ? PAGE_COVER_KEYBOARD_STEP : -PAGE_COVER_KEYBOARD_STEP;
    setDraggedPosition(clampPageCoverPosition(shownPosition + step));
  };

  const stopReposition = (): void => {
    setDraggedPosition(null);
    controller.cancelReposition();
  };

  const keepFraming = (): void => {
    setDraggedPosition(null);
    controller.saveReposition(shownPosition);
  };

  const picture = (
    <ImageWithFallback
      alt=""
      className="object-cover"
      fill
      sizes="100vw"
      src={resolvePageCoverImageUrl(cover)}
      style={{ objectPosition: `center ${String(shownPosition)}%` }}
      /** The optimiser fetches from the server, where nobody is signed in, so the browser loads the image itself. */
      unoptimized
    />
  );

  return (
    <div className="relative h-40 w-full overflow-hidden sm:h-56">
      {isRepositioning ? (
        <div
          aria-label={t('reposition')}
          aria-valuemax={PAGE_COVER_POSITION_MAX}
          aria-valuemin={PAGE_COVER_POSITION_MIN}
          aria-valuenow={shownPosition}
          className="size-full cursor-grab touch-none active:cursor-grabbing"
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="slider"
          tabIndex={0}
        >
          {picture}
        </div>
      ) : (
        picture
      )}
      {isRepositioning && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-background/90 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">{t('repositionHelp')}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <PrimaryButton onClick={stopReposition} type="button" variant="secondary">
              {t('repositionCancel')}
            </PrimaryButton>
            <PrimaryButton onClick={keepFraming} type="button">
              {t('repositionSave')}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};
