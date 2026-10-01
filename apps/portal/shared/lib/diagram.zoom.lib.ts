import { DIAGRAM_ZOOM_LEAST, DIAGRAM_ZOOM_MOST } from '@/shared/constants/diagram.constants';
import type { DiagramSize } from '@/shared/types/diagram.types';

/** Close enough to read and far enough to see whole, and no further either way. */
export const keepDiagramZoomWithinReach = (zoom: number): number =>
  Math.min(DIAGRAM_ZOOM_MOST, Math.max(DIAGRAM_ZOOM_LEAST, zoom));

/**
 * How close a drawing has to be brought for all of it to fit its frame: the
 * side that overflows the most decides. A drawing that never said its size is
 * left at the size it has.
 */
export const measureDiagramFitZoom = (drawn: DiagramSize, room: DiagramSize): number => {
  if (drawn.width <= 0 || drawn.height <= 0) return 1;
  return keepDiagramZoomWithinReach(Math.min(room.width / drawn.width, room.height / drawn.height));
};
