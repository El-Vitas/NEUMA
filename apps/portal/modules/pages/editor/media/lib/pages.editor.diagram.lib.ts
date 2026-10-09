import {
  PAGE_DIAGRAM_FRAME_HEIGHT_LEAST,
  PAGE_DIAGRAM_FRAME_HEIGHT_MOST,
  PAGE_DIAGRAM_LANGUAGE,
  PAGE_DIAGRAM_VIEWS,
  PAGE_FORMULA_LANGUAGE,
  type PageDiagramView,
} from '@company-brain/shared';

/** A block of code written in the language diagrams are written in. */
export const isPageDiagram = (language: unknown): boolean => language === PAGE_DIAGRAM_LANGUAGE;

/** A block of code written in the language formulas are written in. */
export const isPageFormula = (language: unknown): boolean => language === PAGE_FORMULA_LANGUAGE;

/** Whether what is written in this block is meant to be set out rather than read as code. */
export const isPageDrawn = (language: unknown): boolean => isPageDiagram(language) || isPageFormula(language);

/** What is shown of it: what was chosen, and until then the drawing, which is what it is for. */
export const readPageDiagramView = (shown: unknown): PageDiagramView =>
  PAGE_DIAGRAM_VIEWS.find((known) => known === shown) ?? 'drawing';

/** A frame low enough to still show something and no taller than a tall screen, in whole pixels. */
export const keepPageDiagramFrameHeightWithinReach = (height: number): number =>
  Math.min(PAGE_DIAGRAM_FRAME_HEIGHT_MOST, Math.max(PAGE_DIAGRAM_FRAME_HEIGHT_LEAST, Math.round(height)));
