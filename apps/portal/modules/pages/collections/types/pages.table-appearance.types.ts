/** Cómo se ve una tabla, ya resuelto en las dos clases que hacen falta. */
export interface PageTableAppearance {
  /** El aire de cada celda, que es lo que hace que la fila mida más o menos. */
  readonly cellClass: string;
  /** Cuánto mide lo que se toca dentro de la celda, que nunca baja del tamaño de un dedo. */
  readonly controlClass: string;
  /** Cómo se corta lo que la celda dice: en una línea, o en unas cuantas. */
  readonly contentClass: string;
}
