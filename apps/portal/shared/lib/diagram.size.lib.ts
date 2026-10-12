import { DIAGRAM_BOX_GAP } from '@/shared/constants/diagram.constants';

export const readDrawnWidth = (viewBox: string | null): number => readDrawnSide(viewBox, 2);

export const readDrawnHeight = (viewBox: string | null): number => readDrawnSide(viewBox, 3);

const readDrawnSide = (viewBox: string | null, place: number): number => {
  const drawn = Number(viewBox?.trim().split(DIAGRAM_BOX_GAP)[place]);
  return Number.isFinite(drawn) && drawn > 0 ? drawn : 0;
};

export const showTheDrawingAtItsSize = (drawing: HTMLElement, zoom = 1): boolean => {
  const svg = drawing.querySelector('svg');
  const drawn = readDrawnWidth(svg?.getAttribute('viewBox') ?? null);
  if (svg === null || drawn === 0) return false;
  /** Overrides the max-width the drawing asks for, so the column is not its limit. */
  svg.style.maxWidth = 'none';
  svg.style.width = `${String(Math.round(drawn * zoom))}px`;
  return drawing.scrollWidth > drawing.clientWidth;
};
