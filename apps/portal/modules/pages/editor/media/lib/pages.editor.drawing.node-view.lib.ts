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

/**
 * The choice says what it is choosing between: a drawing for a diagram, a
 * formula for a formula. The same three views, named after what is in the box.
 */
const nameTheViews = (choice: HTMLSelectElement, labels: PageEditorDiagramLabels, isFormula: boolean): void => {
  const named = isFormula ? labels.formula : labels;
  choice.setAttribute('aria-label', named.drawing);
  for (const [index, view] of PAGE_DIAGRAM_VIEWS.entries()) {
    const option = choice.options.item(index);
    if (option !== null) option.textContent = named[view];
  }
};

/** What a drawing is saved as: the drawing itself, which is a picture that never blurs. */
const takeDrawingAway = (svg: string): void => {
  const kept = document.createElement('a');
  kept.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  kept.download = 'diagram.svg';
  kept.click();
  URL.revokeObjectURL(kept.href);
};

/**
 * Draws a block of code that is written in the language of diagrams.
 *
 * The writing is what the page keeps; the drawing is made from it here and
 * never saved, so a diagram is exactly what it says and nothing is left behind
 * when it changes.
 *
 * It is drawn once the writing settles rather than on every keystroke: a
 * half-written diagram is mostly a parse error, and redrawing each one of them
 * makes the page flicker at whoever is typing.
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

  /**
   * What went wrong, and — when the parser said so — the line it went wrong on.
   *
   * The drawing beside it is left where it is and dimmed: it is the last one
   * that came out, it no longer says what the writing says, and taking it away
   * at the first typo leaves whoever is writing staring at nothing.
   */
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
    /** The parser often names the line itself; saying it twice helps nobody. */
    const names = line !== null && said.includes(String(line));
    fault.textContent = line === null || names ? said : `${said} · ${parts.labels.line} ${String(line)}`;
  };

  /**
   * What is written is set out by whoever knows how to set it out: the one that
   * draws diagrams, or the one that sets formulas. Both hand back the same
   * thing — what came out, or why nothing did.
   */
  const askForTheDrawing = async (source: string): Promise<Drawn> =>
    isPageFormula(language) ? drawFormula(source) : drawDiagram(source);

  const draw = (source: string): void => {
    if (source.trim().length === 0) {
      drawing.replaceChildren();
      showFault(null, null);
      return;
    }
    void askForTheDrawing(source).then((made) => {
      if (made.html !== null) {
        drawing.innerHTML = made.html;
        if (!isPageFormula(language)) handling.showAtItsSize();
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
    const svg = drawing.innerHTML;
    if (svg.length > 0) takeDrawingAway(svg);
  });
  wide.addEventListener('click', () => askForTheWholeScreen(parts.container));
  /** Taken to the whole screen or brought back, the frame is another size, so the drawing is fitted to it again. */
  parts.container.addEventListener('fullscreenchange', handling.fitToFrame);

  /** A drawing is coloured for the ground it is read on, so it is drawn again when that ground changes. */
  const stopWatchingTheGround = watchTheDiagramGround(() => {
    if (drawn.length === 0) return;
    draw(drawn);
  });

  /**
   * A formula is set out, not drawn: there is no picture of it to bring closer
   * or frame, and a diagram shown only as its writing has none either.
   */
  const showTheDiagramTools = (node: EditorNode, shown: string): void => {
    const isDiagramShown = isPageDiagram(language) && shown !== 'code';
    for (const control of zooming.controls) control.hidden = !isDiagramShown;
    frame.handle.hidden = !isDiagramShown;
    if (isPageDiagram(language)) frame.show(node.attrs.frameHeight);
  };

  return {
    stop: () => {
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
