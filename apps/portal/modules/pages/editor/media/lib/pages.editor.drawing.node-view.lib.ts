import { PAGE_DIAGRAM_VIEWS } from '@company-brain/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import { drawDiagram } from '@/shared/lib/diagram.drawing.lib';
import { isDiagramUnknown } from '@/shared/lib/diagram.fault.lib';
import { watchTheDiagramGround } from '@/shared/lib/diagram.ground.lib';
import { letTheDrawingBeHandled } from '@/shared/lib/diagram.handling.lib';
import { drawFormula } from '@/shared/lib/formula.drawing.lib';
import type { Drawn } from '@/shared/types/diagram.types';
import {
  PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  PAGE_EDITOR_CODE_LANGUAGE_STYLE_CLASS,
  PAGE_EDITOR_MARKS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { askForTheWholeScreen } from '../../lib/pages.editor.asking.lib';
import { createPageMarkButton } from '../../text/lib/pages.editor.marks.lib';
import {
  PAGE_EDITOR_DIAGRAM_DRAWING_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_FAULT_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_SETTLE_MS,
  PAGE_EDITOR_DIAGRAM_STALE_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_WIDE_STYLE_CLASS,
  PAGE_EDITOR_DRAWING_DOWNLOAD_KEPT_MS,
  PAGE_EDITOR_FORMULA_STYLE_CLASS,
} from '../constants/pages.editor.diagram.constants';
import type { PageEditorDiagramLabels } from '../types/pages.editor.diagram.types';
import { attachPageDiagramFrame } from './pages.editor.diagram.frame.lib';
import { isPageDiagram, isPageDrawn, isPageFormula, readPageDiagramView } from './pages.editor.diagram.lib';
import { createPageDiagramZoomControls } from './pages.editor.diagram.zoom.lib';

const createViewChoice = (labels: PageEditorDiagramLabels): HTMLSelectElement => {
  const choice = document.createElement('select');
  choice.className = PAGE_EDITOR_CODE_LANGUAGE_STYLE_CLASS;
  choice.dataset.diagramView = 'true';
  choice.setAttribute('aria-label', labels.drawing);
  for (const view of PAGE_DIAGRAM_VIEWS) {
    const option = document.createElement('option');
    option.value = view;
    choice.append(option);
  }
  return choice;
};

/** The same three views are named after the content: drawing for diagrams, formula for formulas. */
const nameTheViews = (choice: HTMLSelectElement, labels: PageEditorDiagramLabels, isFormula: boolean): void => {
  const named = isFormula ? labels.formula : labels;
  choice.setAttribute('aria-label', named.drawing);
  for (const [index, view] of PAGE_DIAGRAM_VIEWS.entries()) {
    const option = choice.options.item(index);
    if (option !== null) option.textContent = named[view];
  }
};

/** Downloads the SVG at its own size, dropping the width set by zoom. */
const takeDrawingAway = (drawing: HTMLElement): void => {
  const picture = drawing.querySelector('svg')?.cloneNode(true);
  if (!(picture instanceof SVGElement)) return;
  picture.style.removeProperty('width');
  picture.style.removeProperty('max-width');
  const kept = document.createElement('a');
  kept.href = URL.createObjectURL(new Blob([picture.outerHTML], { type: 'image/svg+xml' }));
  kept.download = 'diagram.svg';
  kept.click();
  setTimeout(() => {
    URL.revokeObjectURL(kept.href);
  }, PAGE_EDITOR_DRAWING_DOWNLOAD_KEPT_MS);
};

/**
 * Renders a diagram or formula code block. Only the source is stored; the drawing is derived and never saved.
 * Redraws are debounced because a half-written diagram is mostly a parse error and would flicker.
 */
export const attachPageDrawing = (parts: {
  readonly bar: HTMLElement;
  readonly container: HTMLElement;
  readonly labels: PageEditorDiagramLabels;
  readonly pre: HTMLElement;
  readonly writeAttribute: (name: string, value: number | string | null) => void;
}): { readonly show: (node: EditorNode) => void; readonly stop: () => void } => {
  const drawing = document.createElement('div');
  const fault = document.createElement('div');
  const view = createViewChoice(parts.labels);
  const wide = createPageMarkButton(
    parts.labels.fullScreen,
    PAGE_EDITOR_MARKS.fullScreen,
    PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  );
  const keep = createPageMarkButton(
    parts.labels.download,
    PAGE_EDITOR_MARKS.download,
    PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  );

  const zooming = createPageDiagramZoomControls(parts.labels);
  const frame = attachPageDiagramFrame({
    drawing,
    hint: parts.labels.frameHeightHint,
    label: parts.labels.frameHeight,
    writeHeight: (height) => parts.writeAttribute('frameHeight', height),
  });

  drawing.className = PAGE_EDITOR_DIAGRAM_DRAWING_STYLE_CLASS;
  drawing.dataset.pageDiagram = 'true';
  drawing.contentEditable = 'false';
  fault.className = PAGE_EDITOR_DIAGRAM_FAULT_STYLE_CLASS;
  fault.dataset.diagramFault = 'true';
  fault.hidden = true;
  parts.container.append(drawing, frame.handle, fault);
  parts.bar.prepend(view);
  parts.bar.append(...zooming.controls, keep, wide);

  const handling = letTheDrawingBeHandled(drawing, zooming.showZoom);
  zooming.connect(handling);
  let drawn = '';
  let language = '';
  let settling: ReturnType<typeof setTimeout> | null = null;
  // Set on removal: cancels pending draws and discards in-flight results.
  let isStopped = false;

  // Keeps the last good drawing, dimmed, instead of blanking it at the first typo.
  const showFault = (said: string | null, line: number | null): void => {
    fault.hidden = said === null;
    drawing.classList.toggle(PAGE_EDITOR_DIAGRAM_STALE_STYLE_CLASS, said !== null);
    if (said === null) {
      fault.textContent = '';
      return;
    }
    if (isDiagramUnknown(said)) {
      fault.textContent = parts.labels.unknown;
      return;
    }
    // The parser message often already names the line.
    const names = line !== null && said.includes(String(line));
    fault.textContent = line === null || names ? said : `${said} · ${parts.labels.line} ${String(line)}`;
  };

  const askForTheDrawing = async (source: string): Promise<Drawn> =>
    isPageFormula(language) ? drawFormula(source) : drawDiagram(source);

  const draw = (source: string): void => {
    if (source.trim().length === 0) {
      drawing.replaceChildren();
      showFault(null, null);
      return;
    }
    void askForTheDrawing(source).then((made) => {
      if (isStopped || source !== drawn) return;
      if (made.html !== null) {
        drawing.innerHTML = made.html;
        if (!isPageFormula(language)) handling.showAtItsSize();
        frame.refresh();
      }
      showFault(made.fault?.said ?? null, made.fault?.line ?? null);
    });
  };

  const drawOnceItSettles = (source: string): void => {
    if (source === drawn) return;
    drawn = source;
    if (settling !== null) clearTimeout(settling);
    settling = setTimeout(() => draw(source), PAGE_EDITOR_DIAGRAM_SETTLE_MS);
  };

  view.addEventListener('change', () => parts.writeAttribute('shown', view.value));
  keep.addEventListener('click', () => {
    takeDrawingAway(drawing);
  });
  wide.addEventListener('click', () => askForTheWholeScreen(parts.container));
  // The frame changes size on fullscreen toggle, so refit the drawing.
  parts.container.addEventListener('fullscreenchange', handling.fitToFrame);

  // Diagram colours depend on the theme, so redraw when it changes.
  const stopWatchingTheGround = watchTheDiagramGround(() => {
    if (drawn.length === 0) return;
    draw(drawn);
  });

  // Formulas, and diagrams shown as code, have no picture to zoom or frame.
  const showTheDiagramTools = (node: EditorNode, shown: string): void => {
    const isDiagramShown = isPageDiagram(language) && shown !== 'code';
    for (const control of zooming.controls) control.hidden = !isDiagramShown;
    frame.handle.hidden = !isDiagramShown;
    if (isPageDiagram(language)) frame.show(node.attrs.frameHeight);
  };

  return {
    stop: () => {
      isStopped = true;
      if (settling !== null) clearTimeout(settling);
      stopWatchingTheGround();
      handling.release();
    },
    show: (node) => {
      language = typeof node.attrs.language === 'string' ? node.attrs.language : '';
      const draws = isPageDrawn(language);
      const shown = readPageDiagramView(node.attrs.shown);
      view.hidden = !draws;
      keep.hidden = !isPageDiagram(language);
      wide.hidden = !draws;
      drawing.hidden = !draws || shown === 'code';
      drawing.className = isPageFormula(language)
        ? PAGE_EDITOR_FORMULA_STYLE_CLASS
        : PAGE_EDITOR_DIAGRAM_DRAWING_STYLE_CLASS;
      showTheDiagramTools(node, shown);
      fault.hidden = fault.hidden || !draws;
      parts.pre.hidden = draws && shown === 'drawing';
      parts.container.className = draws
        ? `${PAGE_EDITOR_DIAGRAM_STYLE_CLASS} ${PAGE_EDITOR_DIAGRAM_WIDE_STYLE_CLASS}`
        : '';
      if (!draws) return;
      nameTheViews(view, parts.labels, isPageFormula(language));
      view.value = shown;
      drawOnceItSettles(node.textContent);
    },
  };
};
