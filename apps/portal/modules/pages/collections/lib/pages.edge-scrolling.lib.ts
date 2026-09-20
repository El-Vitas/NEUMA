import { PAGE_EDGE_SCROLL_MARGIN, PAGE_EDGE_SCROLL_SPEED } from '../constants/pages.edge-scrolling.constants';

/**
 * Cuánto hay que desplazar según dónde está la mano, y hacia dónde.
 *
 * Negativo hacia la izquierda, positivo hacia la derecha, cero en el medio.
 * Crece según lo cerca que esté del borde: rozando la franja apenas se mueve y
 * pegado al filo va a tope, para que acercarse de a poco desplace de a poco.
 *
 * Es una cuenta y no un gesto, así que se puede comprobar sin un navegador.
 */
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
