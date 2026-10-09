import { PAGE_DIAGRAM_FRAME_HEIGHT_LEAST, PAGE_DIAGRAM_FRAME_HEIGHT_MOST } from '@company-brain/shared';
import { DIAGRAM_BOUNDED_STYLE_CLASS } from '@/shared/constants/diagram.constants';
import {
  PAGE_EDITOR_DIAGRAM_FRAME_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_FRAME_KEY_STEPS,
  PAGE_EDITOR_DIAGRAM_FRAME_RESET_KEY,
} from '../constants/pages.editor.diagram.constants';
import type { PageEditorDiagramFrameGrip } from '../types/pages.editor.diagram.types';
import { keepPageDiagramFrameHeightWithinReach } from './pages.editor.diagram.lib';

/** The name is what the edge is; how to use it is said apart, so a screen reader does not read instructions as a name. */
const createHandle = (label: string, hint: string): HTMLElement => {
  const handle = document.createElement('div');
  handle.className = PAGE_EDITOR_DIAGRAM_FRAME_HANDLE_STYLE_CLASS;
  handle.contentEditable = 'false';
  handle.dataset.diagramFrameHandle = 'true';
  handle.tabIndex = 0;
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'horizontal');
  handle.setAttribute('aria-label', label);
  handle.setAttribute('aria-description', hint);
  handle.setAttribute('aria-valuemin', String(PAGE_DIAGRAM_FRAME_HEIGHT_LEAST));
  handle.setAttribute('aria-valuemax', String(PAGE_DIAGRAM_FRAME_HEIGHT_MOST));
  return handle;
};

/**
 * The edge a drawing's frame is made taller or lower by.
 *
 * The frame is part of the page: the height it is left at is saved with the
 * block, so everyone sees the diagram in the same frame. It is dragged, or moved
 * with the arrows by whoever does not use a pointer, and a double click or Enter
 * gives the frame back to the drawing, which then decides it again.
 */
export const attachPageDiagramFrame = (parts: {
  readonly drawing: HTMLElement;
  readonly hint: string;
  readonly label: string;
  readonly writeHeight: (height: number | null) => void;
}): {
  readonly handle: HTMLElement;
  readonly refresh: () => void;
  readonly show: (frameHeight: unknown) => void;
} => {
  const handle = createHandle(parts.label, parts.hint);
  let grip: PageEditorDiagramFrameGrip | null = null;

  const readHeight = (): number => parts.drawing.getBoundingClientRect().height;

  /** The height the frame has now, said again whenever the drawing in it changes size. */
  const refresh = (): void => {
    const height = String(Math.round(readHeight()));
    handle.setAttribute('aria-valuenow', height);
    handle.setAttribute('aria-valuetext', `${height} px`);
  };

  const showHeight = (height: number | null): void => {
    parts.drawing.style.height = height === null ? '' : `${String(height)}px`;
    parts.drawing.classList.toggle(DIAGRAM_BOUNDED_STYLE_CLASS, height === null);
    refresh();
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

  /**
   * Taking hold and letting go without moving is a click, and a click does not
   * fix a height nobody chose. What moved is the pointer, not the drawing: a
   * drawing lower than the least a frame may be would otherwise read as moved.
   */
  handle.addEventListener('pointerup', (event) => {
    if (grip === null) return;
    const taken = grip;
    grip = null;
    if (event.clientY === taken.y) return;
    parts.writeHeight(keepPageDiagramFrameHeightWithinReach(taken.height + event.clientY - taken.y));
  });

  handle.addEventListener('pointercancel', () => {
    grip = null;
  });

  handle.addEventListener('keydown', (event) => {
    const step = PAGE_EDITOR_DIAGRAM_FRAME_KEY_STEPS[event.key];
    const isReset = event.key === PAGE_EDITOR_DIAGRAM_FRAME_RESET_KEY;
    if (step === undefined && !isReset) return;
    event.preventDefault();
    event.stopPropagation();
    parts.writeHeight(step === undefined ? null : keepPageDiagramFrameHeightWithinReach(readHeight() + step));
  });

  handle.addEventListener('dblclick', () => {
    parts.writeHeight(null);
  });

  return {
    handle,
    refresh,
    /** A height that arrives from another person or an agent is kept within reach, like one typed here. */
    show: (frameHeight) => {
      showHeight(typeof frameHeight === 'number' ? keepPageDiagramFrameHeightWithinReach(frameHeight) : null);
    },
  };
};
