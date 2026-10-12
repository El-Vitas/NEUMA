'use client';

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { readStoredNumber, writeStoredValue } from '@/shared/lib/browser-storage.lib';
import type { ResizablePanelController, ResizablePanelSettings } from '@/shared/types/resizable-panel.types';

/** The width is stored only once the user picks one, so an untouched panel follows the default. */
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

  /** Adopted after the first paint: the server cannot know the stored width, and reading earlier breaks hydration. */
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
