import { PAGE_EDGE_SCROLL_MARGIN, PAGE_EDGE_SCROLL_SPEED } from '../constants/pages.edge-scrolling.constants';

/** Negative scrolls left, positive right, zero in the middle; grows linearly toward the edge. */
export const readEdgeScrollStep = (
  pointerX: number,
  bounds: { readonly left: number; readonly right: number },
): number => {
  const fromLeft = pointerX - bounds.left;
  const fromRight = bounds.right - pointerX;
  if (fromLeft < PAGE_EDGE_SCROLL_MARGIN) {
    return -Math.round(
      ((PAGE_EDGE_SCROLL_MARGIN - Math.max(fromLeft, 0)) / PAGE_EDGE_SCROLL_MARGIN) * PAGE_EDGE_SCROLL_SPEED,
    );
  }
  if (fromRight < PAGE_EDGE_SCROLL_MARGIN) {
    return Math.round(
      ((PAGE_EDGE_SCROLL_MARGIN - Math.max(fromRight, 0)) / PAGE_EDGE_SCROLL_MARGIN) * PAGE_EDGE_SCROLL_SPEED,
    );
  }
  return 0;
};
