import { DIAGRAM_MOVABLE_STYLE_CLASS, DIAGRAM_ZOOM_WHEEL_STEP } from '@/shared/constants/diagram.constants';
import { readDrawnHeight, readDrawnWidth, showTheDrawingAtItsSize } from '@/shared/lib/diagram.size.lib';
import { keepDiagramZoomWithinReach, measureDiagramFitZoom } from '@/shared/lib/diagram.zoom.lib';
import type { DiagramGrip, DiagramHandling, DiagramSize } from '@/shared/types/diagram.types';

const readDrawnSize = (drawing: HTMLElement): DiagramSize => {
  const viewBox = drawing.querySelector('svg')?.getAttribute('viewBox') ?? null;
  return { height: readDrawnHeight(viewBox), width: readDrawnWidth(viewBox) };
};

/**
 * The room a frame gives its drawing. A frame nobody sized grows with what it
 * holds up to its limit, so that limit — not the height it has now — is the
 * room a drawing has to fit.
 */
const readRoom = (drawing: HTMLElement): DiagramSize => {
  const worn = getComputedStyle(drawing);
  const limit = Number.parseFloat(worn.maxHeight);
  const height = Number.isFinite(limit) ? limit : drawing.clientHeight;
  const across = Number.parseFloat(worn.paddingLeft) + Number.parseFloat(worn.paddingRight);
  const down = Number.parseFloat(worn.paddingTop) + Number.parseFloat(worn.paddingBottom);
  return { height: height - down, width: drawing.clientWidth - across };
};

/**
 * Shows a drawing at the size it was drawn, and lets it be moved and brought closer.
 *
 * A diagram is drawn as wide as it needs to be, which is often wider than the
 * column it is read in: fitted to that column it is shrunk until the writing in
 * it cannot be read, so it keeps its own size and the box it sits in scrolls.
 * What reaches past its box is dragged into view, and what is still too small or
 * too large is brought closer or pushed away with the wheel or the buttons.
 *
 * The first time it is shown, a drawing larger than its frame is fitted to it,
 * so whoever opens the page sees all of it before going through any of it. How
 * close it is brought is up to whoever reads it and is never saved.
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

  /** A drawing in a frame that is not on the screen has no room to be fitted to yet. */
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

  /** Taking hold of a drawing is not writing on the page, so the editor is never told of it. */
  drawing.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || !reachesPastItsBox()) return;
      event.preventDefault();
      event.stopPropagation();
      grip = { left: drawing.scrollLeft, top: drawing.scrollTop, x: event.clientX, y: event.clientY };
      drawing.setPointerCapture(event.pointerId);
    },
    { signal },
  );

  drawing.addEventListener(
    'pointermove',
    (event) => {
      if (grip === null) return;
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
