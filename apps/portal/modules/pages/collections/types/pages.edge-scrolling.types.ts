import type { DragEvent, RefObject } from 'react';

/** Lo que hace falta para que algo se desplace solo mientras se arrastra contra su borde. */
export interface PagesEdgeScrolling {
  readonly onDragLeave: () => void;
  readonly onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  readonly onDrop: () => void;
  /** Lo que se desplaza: el marco por el que asoman las columnas. */
  readonly surface: RefObject<HTMLDivElement | null>;
}
