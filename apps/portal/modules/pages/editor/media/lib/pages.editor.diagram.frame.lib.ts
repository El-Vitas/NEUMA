import { PAGE_DIAGRAM_FRAME_HEIGHT_LEAST, PAGE_DIAGRAM_FRAME_HEIGHT_MOST } from '@company-brain/shared';
import { DIAGRAM_BOUNDED_STYLE_CLASS } from '@/shared/constants/diagram.constants';
import {
  PAGE_EDITOR_DIAGRAM_FRAME_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_FRAME_KEY_STEPS,
} from '../constants/pages.editor.diagram.constants';
import type { PageEditorDiagramFrameGrip } from '../types/pages.editor.diagram.types';
import { keepPageDiagramFrameHeightWithinReach } from './pages.editor.diagram.lib';

const createHandle = (label: string): HTMLElement => {
  const handle = document.createElement('div');
  handle.className = PAGE_EDITOR_DIAGRAM_FRAME_HANDLE_STYLE_CLASS;
  handle.contentEditable = 'false';
  handle.dataset.diagramFrameHandle = 'true';
  handle.tabIndex = 0;
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'horizontal');
  handle.setAttribute('aria-label', label);
  handle.setAttribute('aria-valuemin', String(PAGE_DIAGRAM_FRAME_HEIGHT_LEAST));
  handle.setAttribute('aria-valuemax', String(PAGE_DIAGRAM_FRAME_HEIGHT_MOST));
  return handle;
};

/**
 * The edge a drawing's frame is made taller or lower by.
 *
 * The frame is part of the page: the height it is left at is saved with the
 * block, so everyone sees the diagram in the same frame. It is dragged, or moved
 * with the arrows by whoever does not use a pointer, and a double click gives
 * the frame back to the drawing, which then decides it again.
 */
export const attachPageDiagramFrame = (parts: {
  readonly drawing: HTMLElement;
  readonly label: string;
  readonly writeHeight: (height: number | null) => void;
}): { readonly handle: HTMLElement; readonly show: (frameHeight: unknown) => void } => {
  const handle = createHandle(parts.label);
  let grip: PageEditorDiagramFrameGrip | null = null;

  const readHeight = (): number => parts.drawing.getBoundingClientRect().height;

  const showHeight = (height: number | null): void => {
    parts.drawing.style.height = height === null ? '' : `${String(height)}px`;
    parts.drawing.classList.toggle(DIAGRAM_BOUNDED_STYLE_CLASS, height === null);
    handle.setAttribute('aria-valuenow', String(Math.round(readHeight())));
  };

  /** What is not a pointer taking hold of the edge belongs to the page, not to the frame. */
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    grip = { height: readHeight(), y: event.clientY };
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener('pointermove', (event) => {
    if (grip === null) return;
    showHeight(keepPageDiagramFrameHeightWithinReach(grip.height + event.clientY - grip.y));
  });

  handle.addEventListener('pointerup', () => {
    if (grip === null) return;
    grip = null;
    parts.writeHeight(keepPageDiagramFrameHeightWithinReach(readHeight()));
  });

  handle.addEventListener('pointercancel', () => {
    grip = null;
  });

  handle.addEventListener('keydown', (event) => {
    const step = PAGE_EDITOR_DIAGRAM_FRAME_KEY_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    parts.writeHeight(keepPageDiagramFrameHeightWithinReach(readHeight() + step));
  });

  handle.addEventListener('dblclick', () => {
    parts.writeHeight(null);
  });

  return {
    handle,
    show: (frameHeight) => {
      showHeight(typeof frameHeight === 'number' ? frameHeight : null);
    },
  };
};
