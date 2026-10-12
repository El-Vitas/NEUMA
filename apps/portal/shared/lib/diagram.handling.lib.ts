import {
  DIAGRAM_GRIP_THRESHOLD_PX,
  DIAGRAM_MOVABLE_STYLE_CLASS,
  DIAGRAM_ZOOM_WHEEL_STEP,
} from '@/shared/constants/diagram.constants';
import { readDrawnHeight, readDrawnWidth, showTheDrawingAtItsSize } from '@/shared/lib/diagram.size.lib';
import { keepDiagramZoomWithinReach, measureDiagramFitZoom } from '@/shared/lib/diagram.zoom.lib';
import type { DiagramGrip, DiagramHandling, DiagramSize } from '@/shared/types/diagram.types';

const readDrawnSize = (drawing: HTMLElement): DiagramSize => {
  const viewBox = drawing.querySelector('svg')?.getAttribute('viewBox') ?? null;
  return { height: readDrawnHeight(viewBox), width: readDrawnWidth(viewBox) };
};

/** An unsized frame grows with its content up to its limit, so the limit, not the current height, is the room. */
const readRoom = (drawing: HTMLElement): DiagramSize => {
  const worn = getComputedStyle(drawing);
  const limit = Number.parseFloat(worn.maxHeight);
  const height = Number.isFinite(limit) ? limit : drawing.clientHeight;
  const across = Number.parseFloat(worn.paddingLeft) + Number.parseFloat(worn.paddingRight);
  const down = Number.parseFloat(worn.paddingTop) + Number.parseFloat(worn.paddingBottom);
  return { height: height - down, width: drawing.clientWidth - across };
};

/**
 * A diagram is often wider than its column and fitting it would shrink the text unreadable, so it keeps its own
 * size and the box scrolls. The zoom level is never saved.
 */
export const letTheDrawingBeHandled = (drawing: HTMLElement, tellZoom: (zoom: number) => void): DiagramHandling => {
  const listening = new AbortController();
  const { signal } = listening;
  let zoom = 1;
  let isSized = false;
  let grip: DiagramGrip | null = null;

  const reachesPastItsBox = (): boolean => drawing.scrollWidth > drawing.clientWidth;

  const showAt = (next: number): void => {
    zoom = keepDiagramZoomWithinReach(next);
    drawing.classList.toggle(DIAGRAM_MOVABLE_STYLE_CLASS, showTheDrawingAtItsSize(drawing, zoom));
    tellZoom(zoom);
  };

  const measureFit = (): number => measureDiagramFitZoom(readDrawnSize(drawing), readRoom(drawing));

  const sizeTheFirstTime = (): void => {
    if (isSized || drawing.clientWidth === 0) return;
    isSized = true;
    zoom = Math.min(1, measureFit());
  };

  const letGo = (): void => {
    grip = null;
  };

  drawing.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      showAt(zoom * (event.deltaY < 0 ? DIAGRAM_ZOOM_WHEEL_STEP : 1 / DIAGRAM_ZOOM_WHEEL_STEP));
    },
    { signal },
  );

  /** Grabbing a drawing is not an edit, so the editor is not notified. */
  drawing.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || !reachesPastItsBox()) return;
      event.stopPropagation();
      grip = { left: drawing.scrollLeft, top: drawing.scrollTop, x: event.clientX, y: event.clientY };
    },
    { signal },
  );

  /** A press that stays put is a click and must still reach links in the drawing. */
  drawing.addEventListener(
    'pointermove',
    (event) => {
      if (grip === null) return;
      const moved = Math.hypot(event.clientX - grip.x, event.clientY - grip.y);
      if (!drawing.hasPointerCapture(event.pointerId)) {
        if (moved < DIAGRAM_GRIP_THRESHOLD_PX) return;
        drawing.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      drawing.scrollLeft = grip.left - (event.clientX - grip.x);
      drawing.scrollTop = grip.top - (event.clientY - grip.y);
    },
    { signal },
  );

  drawing.addEventListener('pointerup', letGo, { signal });
  drawing.addEventListener('pointercancel', letGo, { signal });

  return {
    fitToFrame: () => {
      showAt(measureFit());
    },
    release: () => {
      listening.abort();
    },
    showActualSize: () => {
      showAt(1);
    },
    showAtItsSize: () => {
      sizeTheFirstTime();
      showAt(zoom);
    },
    zoomBy: (step) => {
      showAt(zoom * step);
    },
  };
};
