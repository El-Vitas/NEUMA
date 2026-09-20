import type { PageColumnAlignment, PageRowHeight } from '@company-brain/shared';

/**
 * Cuánto aire lleva una celda según el alto pedido.
 *
 * Va como relleno y no como altura: una celda de tabla crece con lo que lleva
 * dentro y el navegador no le hace caso a una altura máxima, así que pedir
 * «alto» con un número no cambiaba nada. Con relleno sí: la fila mide más
 * aunque diga poco, que es lo que se espera al pedirlo.
 */
export const PAGE_TABLE_ROW_PADDING_CLASSES: Readonly<Record<PageRowHeight, string>> = {
  MEDIUM: 'py-3',
  SHORT: 'py-1',
  TALL: 'py-6',
};

/**
 * Cuánto mide de alto lo que se toca dentro de la celda.
 *
 * En el más corto, cuarenta y cuatro píxeles: es lo que mide un objetivo que se
 * pueda tocar con un dedo, y por debajo de eso la tabla deja fuera a quien no
 * usa ratón. De ahí para arriba crece con lo pedido.
 */
export const PAGE_TABLE_CONTROL_HEIGHT_CLASSES: Readonly<Record<PageRowHeight, string>> = {
  MEDIUM: 'min-h-14',
  SHORT: 'min-h-11',
  TALL: 'min-h-24',
};

/**
 * Cuántas líneas se ven de lo que dice una celda cuando el texto se parte.
 *
 * Partir sin tope dejaría que una fila con un párrafo dentro midiera media
 * pantalla, y entonces el alto pedido ya no querría decir nada.
 */
export const PAGE_TABLE_LINE_CLAMP_CLASSES: Readonly<Record<PageRowHeight, string>> = {
  MEDIUM: 'line-clamp-3',
  SHORT: 'line-clamp-1',
  TALL: 'line-clamp-6',
};

/**
 * Cada lado dicho de las dos maneras que hacen falta.
 *
 * La celda alinea su texto, y lo que lleva dentro —un botón que ocupa el ancho
 * entero para poder tocarse en cualquier punto— se alinea como caja. Sin las
 * dos, pedir «al final» movería el texto pero no lo que se está mirando.
 */
export const PAGE_TABLE_ALIGNMENT_CLASSES: Readonly<Record<PageColumnAlignment, string>> = {
  CENTER: 'text-center justify-center',
  END: 'text-right justify-end',
  START: 'text-left justify-start',
};
