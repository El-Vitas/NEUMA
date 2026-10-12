import type { Node as EditorNode } from 'prosemirror-model';
import { DIAGRAM_BOUNDED_STYLE_CLASS } from '@/shared/constants/diagram.constants';
import { drawDiagram } from '@/shared/lib/diagram.drawing.lib';
import { watchTheDiagramGround } from '@/shared/lib/diagram.ground.lib';
import { letTheDrawingBeHandled } from '@/shared/lib/diagram.handling.lib';
import { drawFormula } from '@/shared/lib/formula.drawing.lib';
import type { Drawn } from '@/shared/types/diagram.types';
import {
  PAGE_EDITOR_DIAGRAM_DRAWING_STYLE_CLASS,
  PAGE_EDITOR_DIAGRAM_FAULT_STYLE_CLASS,
  PAGE_EDITOR_FORMULA_STYLE_CLASS,
} from '../../media/constants/pages.editor.diagram.constants';
import { isPageDrawn, isPageFormula, readPageDiagramView } from '../../media/lib/pages.editor.diagram.lib';

export const isBorrowedDrawing = (borrowed: EditorNode): boolean =>
  borrowed.type.name === 'code_block' &&
  isPageDrawn(borrowed.attrs.language) &&
  readPageDiagramView(borrowed.attrs.shown) !== 'code';

/** Read-only drawing: zoom and a bounded frame, no editing controls. Returns the cleanup function. */
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
  const stopWatchingTheGround = isFormula ? () => undefined : watchTheDiagramGround(() => void show());
  return () => {
    stopWatchingTheGround();
    handling.release();
  };
};
