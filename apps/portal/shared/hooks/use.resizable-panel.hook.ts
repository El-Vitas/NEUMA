'use client';

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { readStoredNumber, writeStoredValue } from '@/shared/lib/browser-storage.lib';
import type { ResizablePanelController, ResizablePanelSettings } from '@/shared/types/resizable-panel.types';

/**
 * A panel whose edge can be dragged, and which remembers how wide it was left.
 *
 * The two panels that do this sit on opposite sides of the screen, so the same
 * pointer moving right widens one and narrows the other; that is the only thing
 * they disagree about, and it is the only thing asked for here.
 *
 * The width is written down only once somebody has chosen one, so a panel
 * nobody has touched keeps following whatever the default becomes.
 */
export const useResizablePanel = ({
  clamp,
  defaultWidth,
  grows,
  storageKey,
}: ResizablePanelSettings): ResizablePanelController => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const hasOwnWidthChoice = useRef(false);
  const resizeOrigin = useRef<{ pointerId: number; startWidth: number; startX: number } | null>(null);

  const whereItIsKept = useRef({ clamp, storageKey });

  /**
   * Adopted once, after the first paint.
   *
   * The server has no way to know what this browser remembered, so the panel
   * is first drawn at the width everybody gets and only then takes the width
   * this reader left it at. Reading it any earlier makes the two disagree and
   * React throws the tree away.
   */
  useEffect(() => {
    if (hasOwnWidthChoice.current) return;
    const kept = whereItIsKept.current;
    const stored = readStoredNumber(kept.storageKey);
    if (stored !== null) setWidth(kept.clamp(stored));
  }, []);

  useEffect(() => {
    if (hasOwnWidthChoice.current) writeStoredValue(storageKey, width);
  }, [storageKey, width]);

  const applyWidth = useCallback(
    (nextWidth: number): void => {
      hasOwnWidthChoice.current = true;
      setWidth(clamp(nextWidth));
    },
    [clamp],
  );

  const startResizing = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      event.preventDefault();
      event.currentTarget.focus();
      resizeOrigin.current = { pointerId: event.pointerId, startWidth: width, startX: event.clientX };
      setIsResizing(true);
    },
    [width],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent): void => {
      const origin = resizeOrigin.current;
      if (event.pointerId !== origin?.pointerId) return;
      const travelled = event.clientX - origin.startX;
      applyWidth(origin.startWidth + (grows === 'rightwards' ? travelled : -travelled));
    };

    const stopResizing = (): void => {
      resizeOrigin.current = null;
      setIsResizing(false);
    };

    globalThis.addEventListener('pointermove', handlePointerMove);
    globalThis.addEventListener('pointerup', stopResizing);

    return () => {
      globalThis.removeEventListener('pointermove', handlePointerMove);
      globalThis.removeEventListener('pointerup', stopResizing);
    };
  }, [applyWidth, grows, isResizing]);

  return { applyWidth, startResizing, width };
};
