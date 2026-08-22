import { showTheDrawingAtItsSize } from '@/shared/lib/diagram.size.lib';
import {
  PAGE_EDITOR_DIAGRAM_MOVABLE_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_ZOOM_STEP,
} from '../constants/pages.editor.diagram.constants';
import type { PageEditorDiagramGrip } from '../types/pages.editor.diagram.types';
import { keepPageDiagramZoomWithinReach } from './pages.editor.diagram.lib';

/**
 * Shows a drawing at the size it was drawn, and lets it be moved and brought closer.
 *
 * A diagram is drawn as wide as it needs to be, which is often wider than the
 * column it is read in: fitted to that column it is shrunk until the writing in
 * it cannot be read, so it keeps its own size and the box it sits in scrolls.
 * What reaches past its box is dragged into view, and what is still too small or
 * too large is brought closer or pushed away with the wheel.
 */
export const letTheDrawingBeHandled = (drawing: HTMLElement): { readonly showAtItsSize: () => void } => {
  let zoom = 1;
  let grip: PageEditorDiagramGrip | null = null;

  const reachesPastItsBox = (): boolean => drawing.scrollWidth > drawing.clientWidth;

  const showAtItsSize = (): void => {
    drawing.classList.toggle(PAGE_EDITOR_DIAGRAM_MOVABLE_STYLE_CLASS, showTheDrawingAtItsSize(drawing, zoom));
  };

  const bringCloserBy = (step: number): void => {
    zoom = keepPageDiagramZoomWithinReach(zoom * step);
    showAtItsSize();
  };

  const letGo = (): void => {
    grip = null;
  };

  drawing.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    bringCloserBy(event.deltaY < 0 ? PAGE_EDITOR_DIAGRAM_ZOOM_STEP : 1 / PAGE_EDITOR_DIAGRAM_ZOOM_STEP);
  });

  /** Taking hold of a drawing is not writing on the page, so the editor is never told of it. */
  drawing.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !reachesPastItsBox()) return;
    event.preventDefault();
    event.stopPropagation();
    grip = { left: drawing.scrollLeft, top: drawing.scrollTop, x: event.clientX, y: event.clientY };
    drawing.setPointerCapture(event.pointerId);
  });

  drawing.addEventListener('pointermove', (event) => {
    if (grip === null) return;
    drawing.scrollLeft = grip.left - (event.clientX - grip.x);
    drawing.scrollTop = grip.top - (event.clientY - grip.y);
  });

  drawing.addEventListener('pointerup', letGo);
  drawing.addEventListener('pointercancel', letGo);

  return { showAtItsSize };
};
