import type { PageOptionColor } from '@company-brain/shared';

/**
 * Lo que se puede hacer con las columnas de un tablero, desde el tablero mismo.
 *
 * Lo de arriba es del valor y se ve en todas las vistas; lo de abajo es de esta
 * vista y solo cambia cómo se está mirando.
 */
export interface PagesBoardColumns {
  readonly addColumn: (name: string) => void;
  readonly isBusy: boolean;
  /** La deja justo antes de otra, o al final cuando no hay ninguna a su derecha. */
  readonly moveColumn: (value: string, beforeValue: null | string) => void;
  /** Un puesto a un lado o al otro, que es como se mueve sin ratón. */
  readonly moveColumnSideways: (value: string, direction: 'EARLIER' | 'LATER') => void;
  readonly paintColumn: (value: string, color: PageOptionColor | null) => void;
  /** Quita la columna, no lo que había dentro: sus filas se quedan sin valor. */
  readonly removeColumn: (value: string) => void;
  /** Cambia el nombre en la forma y en todas las filas que lo tenían, de una vez. */
  readonly renameColumn: (from: string, to: string) => void;

  readonly collapsedColumns: readonly string[];
  /** Si las columnas sin ninguna tarjeta se dejan de mostrar, tal como lo pidió esta vista. */
  readonly hidesEmptyGroups: boolean;
  readonly hidesUnassignedColumn: boolean;
  readonly limits: Readonly<Record<string, number>>;
  /** Cuántas tarjetas se esperan en esa columna, o ninguna espera. */
  readonly setLimit: (value: string, limit: null | number) => void;
  readonly toggleCollapsed: (value: string) => void;
  readonly toggleUnassignedColumn: () => void;
}
