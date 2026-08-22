import { PAGE_DIAGRAM_VIEWS, type PageDiagramView } from '@company-brain/shared';
import {
  PAGE_EDITOR_DIAGRAM_BOX_GAP,
  PAGE_EDITOR_DIAGRAM_LANGUAGE,
  PAGE_EDITOR_DIAGRAM_ZOOM_LEAST,
  PAGE_EDITOR_DIAGRAM_ZOOM_MOST,
  PAGE_EDITOR_FORMULA_LANGUAGE,
} from '../constants/pages.editor.diagram.constants';

/** A block of code written in the language diagrams are written in. */
export const isPageDiagram = (language: unknown): boolean => language === PAGE_EDITOR_DIAGRAM_LANGUAGE;

/** A block of code written in the language formulas are written in. */
export const isPageFormula = (language: unknown): boolean => language === PAGE_EDITOR_FORMULA_LANGUAGE;

/** Whether what is written in this block is meant to be set out rather than read as code. */
export const isPageDrawn = (language: unknown): boolean => isPageDiagram(language) || isPageFormula(language);

/** What is shown of it: what was chosen, and until then the drawing, which is what it is for. */
export const readPageDiagramView = (shown: unknown): PageDiagramView =>
  PAGE_DIAGRAM_VIEWS.find((known) => known === shown) ?? 'drawing';

/**
 * How wide the drawing was drawn, taken from the box it was drawn inside.
 *
 * It is what the drawing is shown at, because a diagram squeezed into the width
 * of the column is drawn at whatever fraction of its size fits there, and what
 * it says stops being readable long before it stops being wide.
 */
export const readPageDiagramDrawnWidth = (viewBox: string | null): number => {
  const drawn = Number(viewBox?.trim().split(PAGE_EDITOR_DIAGRAM_BOX_GAP)[2]);
  return Number.isFinite(drawn) && drawn > 0 ? drawn : 0;
};

/** Close enough to read and far enough to see whole, and no further either way. */
export const keepPageDiagramZoomWithinReach = (zoom: number): number =>
  Math.min(PAGE_EDITOR_DIAGRAM_ZOOM_MOST, Math.max(PAGE_EDITOR_DIAGRAM_ZOOM_LEAST, zoom));
