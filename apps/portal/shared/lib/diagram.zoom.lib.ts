import { DIAGRAM_ZOOM_LEAST, DIAGRAM_ZOOM_MOST } from '@/shared/constants/diagram.constants';
import type { DiagramSize } from '@/shared/types/diagram.types';

export const keepDiagramZoomWithinReach = (zoom: number): number =>
  Math.min(DIAGRAM_ZOOM_MOST, Math.max(DIAGRAM_ZOOM_LEAST, zoom));

/** The side that overflows the most decides; a drawing with no known size is left as is. */
export const measureDiagramFitZoom = (drawn: DiagramSize, room: DiagramSize): number => {
  if (drawn.width <= 0 || drawn.height <= 0) return 1;
  return keepDiagramZoomWithinReach(Math.min(room.width / drawn.width, room.height / drawn.height));
};
