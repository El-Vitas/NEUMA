import { DIAGRAM_ZOOM_BUTTON_STEP, DIAGRAM_ZOOM_PERCENT } from '@/shared/constants/diagram.constants';
import type { DiagramHandling } from '@/shared/types/diagram.types';
import {
  PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  PAGE_EDITOR_MARKS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { createPageMarkButton } from '../../text/lib/pages.editor.marks.lib';
import { PAGE_EDITOR_DIAGRAM_ZOOM_LEVEL_STYLE_CLASS } from '../constants/pages.editor.diagram.constants';
import type { PageEditorDiagramLabels } from '../types/pages.editor.diagram.types';

const createZoomLevel = (label: string): HTMLButtonElement => {
  const level = document.createElement('button');
  level.type = 'button';
  level.className = `${PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS} ${PAGE_EDITOR_DIAGRAM_ZOOM_LEVEL_STYLE_CLASS}`;
  level.setAttribute('aria-label', label);
  level.title = label;
  return level;
};

/** Preventing mousedown keeps the editor selection when a toolbar button is pressed. */
const keepTheWritingWhereItWas = (button: HTMLButtonElement): void => {
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
};

/** Zoom buttons for users without a wheel; the level button resets to actual size. */
export const createPageDiagramZoomControls = (
  labels: PageEditorDiagramLabels,
): {
  readonly connect: (handling: DiagramHandling) => void;
  readonly controls: readonly HTMLButtonElement[];
  readonly showZoom: (zoom: number) => void;
} => {
  const zoomOut = createPageMarkButton(labels.zoomOut, PAGE_EDITOR_MARKS.zoomOut, PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS);
  const level = createZoomLevel(labels.actualSize);
  const zoomIn = createPageMarkButton(labels.zoomIn, PAGE_EDITOR_MARKS.zoomIn, PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS);
  const fit = createPageMarkButton(
    labels.fitToFrame,
    PAGE_EDITOR_MARKS.fitToFrame,
    PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  );
  const controls = [zoomOut, level, zoomIn, fit];
  for (const button of controls) keepTheWritingWhereItWas(button);

  return {
    connect: (handling) => {
      zoomOut.addEventListener('click', () => {
        handling.zoomBy(1 / DIAGRAM_ZOOM_BUTTON_STEP);
      });
      zoomIn.addEventListener('click', () => {
        handling.zoomBy(DIAGRAM_ZOOM_BUTTON_STEP);
      });
      fit.addEventListener('click', handling.fitToFrame);
      level.addEventListener('click', handling.showActualSize);
    },
    controls,
    // The accessible name starts with the visible text so voice control can target it.
    showZoom: (zoom) => {
      const shown = `${String(Math.round(zoom * DIAGRAM_ZOOM_PERCENT))} %`;
      level.textContent = shown;
      level.setAttribute('aria-label', `${shown}, ${labels.actualSize}`);
    },
  };
};
