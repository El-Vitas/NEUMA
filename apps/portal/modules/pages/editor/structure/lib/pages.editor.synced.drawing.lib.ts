import type { Node as EditorNode } from 'prosemirror-model';
import { DIAGRAM_BOUNDED_STYLE_CLASS } from '@/shared/constants/diagram.constants';
import { drawDiagram } from '@/shared/lib/diagram.drawing.lib';
import { letTheDrawingBeHandled } from '@/shared/lib/diagram.handling.lib';
import { drawFormula } from '@/shared/lib/formula.drawing.lib';
import type { Drawn } from '@/shared/types/diagram.types';
import {
  PAGE_EDITOR_DIAGRAM_DRAWING_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_FAULT_STYLE_CLASS,
  PAGE_EDITOR_FORMULA_STYLE_CLASS,
} from '../../media/constants/pages.editor.diagram.constants';
import { isPageDrawn, isPageFormula, readPageDiagramView } from '../../media/lib/pages.editor.diagram.lib';

/** Whether a borrowed block is a diagram or a formula its own page shows drawn. */
export const isBorrowedDrawing = (borrowed: EditorNode): boolean =>
  borrowed.type.name === 'code_block' &&
  isPageDrawn(borrowed.attrs.language) &&
  readPageDiagramView(borrowed.attrs.shown) !== 'code';

/**
 * Draws a borrowed diagram or formula the way its own page draws it, instead
 * of showing its writing: a synced diagram shown as code reads as broken.
 *
 * It is only looked at here, so it gets the bounded frame and the wheel to
 * bring it closer, but none of the controls that change it. Says how to let
 * the drawing go when the block is gone.
 */
export const drawBorrowedBlock = (borrowed: EditorNode, body: HTMLElement): (() => void) => {
  const isFormula = isPageFormula(borrowed.attrs.language);
  const drawing = document.createElement('div');
  drawing.className = isFormula
    ? PAGE_EDITOR_FORMULA_STYLE_CLASS
    : `${PAGE_EDITOR_DIAGRAM_DRAWING_STYLE_CLASS} ${DIAGRAM_BOUNDED_STYLE_CLASS}`;
  drawing.dataset.pageDiagram = 'true';
  body.replaceChildren(drawing);
  const handling = letTheDrawingBeHandled(drawing, () => undefined);
  const source = borrowed.textContent;
  const show = async (): Promise<void> => {
    const made: Drawn = isFormula ? drawFormula(source) : await drawDiagram(source);
    if (made.html === null) {
      const fault = document.createElement('p');
      fault.className = PAGE_EDITOR_DIAGRAM_FAULT_STYLE_CLASS;
      fault.textContent = made.fault?.said ?? '';
      body.replaceChildren(fault);
      return;
    }
    drawing.innerHTML = made.html;
    if (!isFormula) handling.showAtItsSize();
  };
  void show();
  return handling.release;
};
