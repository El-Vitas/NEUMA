import {
  PAGE_DIAGRAM_FRAME_HEIGHT_LEAST,
  PAGE_DIAGRAM_FRAME_HEIGHT_MOST,
  PAGE_DIAGRAM_LANGUAGE,
  PAGE_DIAGRAM_VIEWS,
  PAGE_FORMULA_LANGUAGE,
  type PageDiagramView,
} from '@company-brain/shared';

export const isPageDiagram = (language: unknown): boolean => language === PAGE_DIAGRAM_LANGUAGE;

export const isPageFormula = (language: unknown): boolean => language === PAGE_FORMULA_LANGUAGE;

export const isPageDrawn = (language: unknown): boolean => isPageDiagram(language) || isPageFormula(language);

/** Defaults to the drawing when no valid view was chosen. */
export const readPageDiagramView = (shown: unknown): PageDiagramView =>
  PAGE_DIAGRAM_VIEWS.find((known) => known === shown) ?? 'drawing';

/** Clamps to the allowed range and rounds to whole pixels. */
export const keepPageDiagramFrameHeightWithinReach = (height: number): number =>
  Math.min(PAGE_DIAGRAM_FRAME_HEIGHT_MOST, Math.max(PAGE_DIAGRAM_FRAME_HEIGHT_LEAST, Math.round(height)));
