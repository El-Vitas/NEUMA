import type { PageColumnAlignment, PageRowHeight } from '@company-brain/shared';

/** Lo que se puede hacer con las columnas de una tabla, desde la tabla misma. */
export interface PagesTableColumns {
  /** Hacia qué lado se pega cada columna, por la propiedad que la columna es. */
  readonly alignments: Readonly<Record<string, PageColumnAlignment>>;
  readonly rowHeight: PageRowHeight;
  readonly setAlignment: (columnKey: string, alignment: PageColumnAlignment) => void;
  readonly setRowHeight: (rowHeight: PageRowHeight) => void;
  /** Que el texto largo se parta en varias líneas, o que se corte. */
  readonly toggleWrapsText: () => void;
  readonly wrapsText: boolean;
  /** Cuántas de la izquierda se quedan quietas, contando la del nombre como la primera. */
  readonly frozenColumns: number;
  readonly isBusy: boolean;
  /** La deja justo antes de otra, o al final cuando no hay ninguna a su derecha. */
  readonly moveColumn: (propertyKey: string, beforeKey: null | string) => void;
  /** Un puesto a un lado o al otro, que es como se mueve sin ratón. */
  readonly moveColumnSideways: (propertyKey: string, direction: 'EARLIER' | 'LATER') => void;
  readonly setFrozenColumns: (count: number) => void;
  readonly setWidth: (propertyKey: string, width: number) => void;
  readonly widths: Readonly<Record<string, number>>;
}
