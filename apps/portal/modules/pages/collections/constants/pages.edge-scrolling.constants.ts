/**
 * Cuánto mide la franja de cada borde que pide desplazar, en píxeles.
 *
 * Ancha como una columna estrecha: si fuera de unos pocos píxeles habría que
 * acertar el borde con la tarjeta en la mano, que es justo cuando peor se
 * apunta.
 */
export const PAGE_EDGE_SCROLL_MARGIN = 72;

/**
 * Cuánto se desplaza como mucho en cada cuadro, en píxeles.
 *
 * Pegado al borde va a esta velocidad y en el filo de la franja casi no se
 * mueve, para que acercarse de a poco desplace de a poco y no haya que retirar
 * la mano para frenar.
 */
export const PAGE_EDGE_SCROLL_SPEED = 18;
