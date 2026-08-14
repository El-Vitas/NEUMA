import { DIAGRAM_BOX_GAP } from '@/shared/constants/diagram.constants';

/**
 * How wide the drawing was drawn, taken from the box it was drawn inside.
 *
 * It is what the drawing is shown at, because a diagram squeezed into the width
 * of the column is drawn at whatever fraction of its size fits there, and what
 * it says stops being readable long before it stops being wide.
 */
export const readDrawnWidth = (viewBox: string | null): number => {
  const drawn = Number(viewBox?.trim().split(DIAGRAM_BOX_GAP)[2]);
  return Number.isFinite(drawn) && drawn > 0 ? drawn : 0;
};

/**
 * Shows a drawing at the size it was drawn, times however much closer it has
 * been brought, and says whether it now reaches past the box it sits in.
 */
export const showTheDrawingAtItsSize = (drawing: HTMLElement, zoom = 1): boolean => {
  const svg = drawing.querySelector('svg');
  const drawn = readDrawnWidth(svg?.getAttribute('viewBox') ?? null);
  if (svg === null || drawn === 0) return false;
  /** The drawing asks to be no wider than the column; it is told the column is not the limit. */
  svg.style.maxWidth = 'none';
  svg.style.width = `${String(Math.round(drawn * zoom))}px`;
  return drawing.scrollWidth > drawing.clientWidth;
};

/**
 * Shows a drawing fitted to the box it sits in, however wide it was drawn.
 *
 * Fitting it makes the writing inside smaller, which is why it is never what
 * happens on its own — but a drawing three times the width of the column is
 * read by nobody either, and this is how somebody sees the whole of one at a
 * glance before deciding to go through it.
 */
export const fitTheDrawingToItsBox = (drawing: HTMLElement): void => {
  const svg = drawing.querySelector('svg');
  if (svg === null) return;
  svg.style.maxWidth = '100%';
  svg.style.width = 'auto';
};
