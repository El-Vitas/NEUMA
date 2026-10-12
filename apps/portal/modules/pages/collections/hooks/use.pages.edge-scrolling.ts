'use client';

import type { DragEvent } from 'react';
import { useEffect, useRef } from 'react';
import { readEdgeScrollStep } from '../lib/pages.edge-scrolling.lib';
import type { PagesEdgeScrolling } from '../types/pages.edge-scrolling.types';

/** Scrolls per animation frame, not per event: the browser stops firing drag events when the pointer rests. */
export const usePagesEdgeScrolling = (): PagesEdgeScrolling => {
  const frame = useRef<null | number>(null);
  const step = useRef(0);
  const surface = useRef<HTMLDivElement | null>(null);

  const stop = (): void => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    step.current = 0;
  };

  const keepScrolling = (): void => {
    const element = surface.current;
    if (element === null || step.current === 0) {
      stop();
      return;
    }
    element.scrollLeft += step.current;
    frame.current = requestAnimationFrame(keepScrolling);
  };

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return {
    onDragLeave: stop,
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      const element = surface.current;
      if (element === null) return;
      const bounds = element.getBoundingClientRect();
      step.current = readEdgeScrollStep(event.clientX, { left: bounds.left, right: bounds.right });
      if (step.current !== 0 && frame.current === null) frame.current = requestAnimationFrame(keepScrolling);
      if (step.current === 0) stop();
    },
    onDrop: stop,
    surface,
  };
};
