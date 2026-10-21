'use client';

import type { PageTimelineChangeMode } from '@neuma/shared';
import type { PointerEvent } from 'react';
import { useState } from 'react';
import { readTimelineDragDays } from '../lib/pages.timeline.lib';
import type { PagesTimelineDragging, PageTimelineDrag } from '../types/pages.timeline.types';

/**
 * Follows the pointer from the press on a bar or on one of its ends to the release, in whole days. The pointer is
 * captured by the element pressed, so the drag goes on outside it; nothing is written until the release, and a release
 * on the day it started on writes nothing.
 */
export const usePagesTimelineDragging = (
  pixelsPerDay: number,
  commit: (rowId: string, mode: PageTimelineChangeMode, deltaDays: number) => void,
): PagesTimelineDragging => {
  const [drag, setDrag] = useState<null | PageTimelineDrag>(null);

  return {
    begin: (event: PointerEvent<HTMLElement>, rowId: string, mode: PageTimelineChangeMode) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ deltaDays: 0, mode, rowId, startX: event.clientX });
    },
    cancel: () => setDrag(null),
    drag,
    end: (event: PointerEvent<HTMLElement>) => {
      if (drag === null) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      setDrag(null);
      commit(drag.rowId, drag.mode, readTimelineDragDays(drag.startX, event.clientX, pixelsPerDay));
    },
    move: (event: PointerEvent<HTMLElement>) => {
      if (drag === null) return;
      const deltaDays = readTimelineDragDays(drag.startX, event.clientX, pixelsPerDay);
      if (deltaDays !== drag.deltaDays) setDrag({ ...drag, deltaDays });
    },
  };
};
